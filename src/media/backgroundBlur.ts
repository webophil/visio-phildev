import type { RTKSelfMedia, VideoMiddleware } from '@cloudflare/realtimekit'

import type { VideoEffectId } from '../types/meeting'

/**
 * Flou d'arrière-plan — traitement **entièrement local**.
 *
 * Le SDK RealtimeKit n'expose pas d'effet de flou natif : il fournit un point
 * d'accroche, `addVideoMiddleware`, qui confie chaque image de la caméra à un
 * canevas avant sa publication. Ce module s'appuie dessus :
 *
 * 1. un détourage de la silhouette est calculé localement par MediaPipe Selfie
 *    Segmentation (WebAssembly servi par l'application, aucun service externe) ;
 * 2. l'image publiée est composée du fond flouté et de la silhouette nette.
 *
 * Aucune seconde capture de la caméra n'est ouverte : le SDK reste l'unique
 * propriétaire de la piste vidéo, et la piste audio n'est jamais touchée.
 */

/** Dossier des fichiers du moteur, servis depuis `public/vendor`. */
const ENGINE_PATH = '/vendor/mediapipe/selfie_segmentation'

/**
 * Le moteur est chargé par une **balise `<script>` servie par l'application**,
 * jamais par un `import` du bundle.
 *
 * Le paquet npm `@mediapipe/selfie_segmentation` est un script classique qui
 * publie son constructeur sur `window.SelfieSegmentation`. Compilé par le
 * bundler, il produit un module **sans aucun export** : l'ancien
 * `import { SelfieSegmentation }` valait `undefined`, la fabrique du middleware
 * levait, le SDK retombait silencieusement sur la piste brute et l'interface
 * affichait « Flou · Actif » sans le moindre effet. Charger le script comme le
 * documente MediaPipe supprime cette dépendance à l'interopérabilité du
 * bundler.
 */
export const BLUR_ENGINE_SCRIPT_URL = `${ENGINE_PATH}/selfie_segmentation.js`

/** Fréquence du détourage : entre deux calculs, le dernier masque est réutilisé. */
const SEGMENT_INTERVAL_MS = 70

/** Largeur du plan de travail : inutile de segmenter en pleine résolution. */
const WORK_WIDTH = 480

/** Résolution du masque : un contour flou n'a pas besoin de plus. */
const MASK_WIDTH = 160

/** Diviseur appliqué au fond avant agrandissement (flou économique). */
const BLUR_DIVISOR = 8

/** Rayon d'adoucissement du contour de la silhouette, en pixels. */
const FEATHER_PX = 3

/**
 * Largeur maximale du calque « personne nette ».
 * Au-delà, la composition coûte plus cher que le gain de netteté apporté :
 * mieux vaut une silhouette légèrement adoucie qu'une réunion qui saccade.
 */
const PERSON_MAX_WIDTH = 960

/** Délai maximal accordé au moteur pour produire un premier masque. */
const ENGINE_WARMUP_TIMEOUT_MS = 12000

/**
 * Délai laissé au SDK pour alimenter le traitement en images avant de conclure
 * qu'il ne l'appelle pas. Le SDK interroge le middleware toutes les 50 ms.
 */
const FRAME_ARRIVAL_TIMEOUT_MS = 4000

/** Taille du plan de travail pour une image source. */
export function normalizedWorkSize(width: number, height: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 }

  const scale = Math.min(1, WORK_WIDTH / width)
  const scaledWidth = Math.max(2, Math.round((width * scale) / 2) * 2)
  const scaledHeight = Math.max(2, Math.round((height * scale) / 2) * 2)

  return { width: scaledWidth, height: scaledHeight }
}

/**
 * Signature publique du moteur, réduite à ce que nous utilisons.
 * Les types du paquet ne sont pas importés : le module est chargé à l'exécution
 * par une balise `<script>`, pas par le bundle.
 */
interface SegmentationResults {
  segmentationMask?: CanvasImageSource
}

interface SegmentationEngine {
  onResults(listener: (results: SegmentationResults) => void): void
  setOptions(options: { modelSelection?: number }): void
  initialize(): Promise<void>
  send(inputs: { image: HTMLCanvasElement }): Promise<void>
  close(): Promise<void>
}

type SegmentationEngineConstructor = new (config: {
  locateFile: (file: string) => string
}) => SegmentationEngine

declare global {
  interface Window {
    SelfieSegmentation?: SegmentationEngineConstructor
  }
}

/** Erreur d'application d'un effet, déjà formulée pour l'utilisateur. */
export class VideoEffectError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VideoEffectError'
  }
}

/** Fonction appliquée à chaque image par le SDK (canvas déjà peint du flux brut). */
export type FrameRenderer = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => Promise<void>

/**
 * Compteurs de fonctionnement, sans aucune donnée d'image.
 * Ils servent à prouver que le traitement reçoit réellement des images et à
 * afficher un état vérifiable dans le panneau « Effets de fond ».
 */
export interface VideoEffectStats {
  /** Images remises au traitement par le SDK. */
  imagesReceived: number
  /** Images effectivement recomposées (fond flouté). */
  imagesBlurred: number
  /** Masques de détourage reçus du moteur. */
  masks: number
  /** Images reçues par seconde, sur la dernière fenêtre mesurée. */
  imagesPerSecond: number
  /** Masques reçus par seconde, sur la dernière fenêtre mesurée. */
  masksPerSecond: number
  /** Temps écoulé depuis la dernière image reçue, en millisecondes. */
  lastImageAgoMs: number | null
}

export interface BackgroundBlurRenderer {
  render: FrameRenderer
  stats: () => VideoEffectStats
  /** Appelé si la composition échoue durablement : l'appelant prévient l'utilisateur. */
  onFailure?: (message: string) => void
  dispose: () => void
}

let enginePromise: Promise<SegmentationEngineConstructor> | null = null

/**
 * Charge le moteur depuis notre propre origine.
 * Une seule requête, partagée entre toutes les activations.
 */
function loadEngine(): Promise<SegmentationEngineConstructor> {
  const published = window.SelfieSegmentation
  if (published) return Promise.resolve(published)
  if (enginePromise) return enginePromise

  enginePromise = new Promise<SegmentationEngineConstructor>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = BLUR_ENGINE_SCRIPT_URL
    script.async = true

    script.addEventListener('load', () => {
      const constructor = window.SelfieSegmentation
      if (constructor) {
        resolve(constructor)
        return
      }
      enginePromise = null
      reject(
        new VideoEffectError(
          "Le moteur de détourage s'est chargé sans exposer son interface. Votre caméra reste diffusée sans effet.",
        ),
      )
    })

    script.addEventListener('error', () => {
      enginePromise = null
      script.remove()
      reject(
        new VideoEffectError(
          "Le moteur de détourage n'a pas pu être chargé depuis l'application. Votre caméra reste diffusée sans effet.",
        ),
      )
    })

    document.head.append(script)
  })

  return enginePromise
}

/**
 * Prépare le détourage puis renvoie la fonction de composition appliquée à
 * chaque image.
 *
 * Le moteur est **vérifié avant de rendre la main** : un masque de test est
 * calculé sur une image locale. Si le WebAssembly, le graphe ou le modèle ne
 * répondent pas, l'appel échoue ici — donc visiblement — au lieu de laisser le
 * SDK retomber en silence sur la piste brute.
 */
export async function createBackgroundBlurRenderer(): Promise<BackgroundBlurRenderer> {
  const Engine = await loadEngine()

  const work = document.createElement('canvas')
  const workCtx = work.getContext('2d')
  const person = document.createElement('canvas')
  const personCtx = person.getContext('2d')
  const backdrop = document.createElement('canvas')
  const backdropCtx = backdrop.getContext('2d')
  const mask = document.createElement('canvas')
  const maskCtx = mask.getContext('2d', { willReadFrequently: true })

  if (!workCtx || !personCtx || !backdropCtx || !maskCtx) {
    throw new VideoEffectError("Le flou d'arrière-plan n'est pas disponible sur ce navigateur.")
  }

  mask.width = MASK_WIDTH
  mask.height = Math.round(MASK_WIDTH * 0.5625)

  const segmenter = new Engine({ locateFile: (file) => `${ENGINE_PATH}/${file}` })
  // `modelSelection: 1` = modèle « paysage », adapté à une webcam 16:9.
  segmenter.setOptions({ modelSelection: 1 })

  let maskReady = false
  let segmenting = false
  let lastSegmentAt = 0
  let disposed = false

  let imagesReceived = 0
  let imagesBlurred = 0
  let masks = 0
  let lastImageAt = 0
  let imagesPerSecond = 0
  let masksPerSecond = 0
  let windowStartedAt = performance.now()
  let imagesInWindow = 0
  let masksInWindow = 0
  let failures = 0

  /** Résolution de la vérification initiale du moteur. */
  let resolveWarmup: ((ok: boolean) => void) | null = null

  const sampleRates = () => {
    const now = performance.now()
    const elapsed = now - windowStartedAt
    if (elapsed < 1000) return
    imagesPerSecond = Math.round((imagesInWindow * 1000) / elapsed)
    masksPerSecond = Math.round((masksInWindow * 1000) / elapsed)
    imagesInWindow = 0
    masksInWindow = 0
    windowStartedAt = now
  }

  const renderer: BackgroundBlurRenderer = {
    render: async () => {},
    stats: () => ({
      imagesReceived,
      imagesBlurred,
      masks,
      imagesPerSecond,
      masksPerSecond,
      lastImageAgoMs: lastImageAt === 0 ? null : Math.round(performance.now() - lastImageAt),
    }),
    dispose: () => {
      if (disposed) return
      disposed = true
      resolveWarmup?.(false)
      resolveWarmup = null
      void segmenter.close().catch(() => {
        // Le moteur peut déjà être arrêté : rien à signaler à l'utilisateur.
      })
    },
  }

  segmenter.onResults((results) => {
    if (disposed) return

    const segmentationMask = results.segmentationMask
    if (!segmentationMask) {
      // Le graphe a répondu sans masque : le test initial doit échouer.
      resolveWarmup?.(false)
      resolveWarmup = null
      return
    }

    // Pendant la vérification initiale, le masque de l'image de test est ignoré.
    if (resolveWarmup) {
      resolveWarmup(true)
      resolveWarmup = null
      return
    }

    maskCtx.clearRect(0, 0, mask.width, mask.height)
    maskCtx.drawImage(segmentationMask, 0, 0, mask.width, mask.height)

    // Le masque MediaPipe est en niveaux de gris **opaques** : la silhouette est
    // blanche, le fond noir. La composition canvas travaille sur le canal alpha,
    // d'où la conversion luminance → alpha.
    const image = maskCtx.getImageData(0, 0, mask.width, mask.height)
    const data = image.data
    for (let index = 0; index < data.length; index += 4) {
      const luma = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114
      data[index] = 255
      data[index + 1] = 255
      data[index + 2] = 255
      data[index + 3] = luma
    }
    maskCtx.putImageData(image, 0, 0)
    maskReady = true
    masks += 1
    masksInWindow += 1
    sampleRates()
  })

  // --- Vérification initiale du moteur ------------------------------------
  await segmenter.initialize()

  // Image de test locale : un aplat suffit à prouver que le graphe, le
  // WebAssembly et le modèle répondent. Aucune image de caméra n'est envoyée.
  const probe = document.createElement('canvas')
  probe.width = 320
  probe.height = 180
  const probeCtx = probe.getContext('2d')
  if (probeCtx) {
    probeCtx.fillStyle = '#2b3440'
    probeCtx.fillRect(0, 0, probe.width, probe.height)
  }

  const warm = await new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolveWarmup = null
      resolve(ok)
    }

    const timer = window.setTimeout(() => finish(false), ENGINE_WARMUP_TIMEOUT_MS)
    resolveWarmup = () => finish(true)

    void segmenter.send({ image: probe }).catch(() => finish(false))
  })

  if (disposed) {
    throw new VideoEffectError("Le flou d'arrière-plan a été interrompu pendant son initialisation.")
  }

  if (!warm) {
    renderer.dispose()
    throw new VideoEffectError(
      "Le moteur de détourage n'a pas répondu : le flou reste désactivé et votre caméra est diffusée telle quelle.",
    )
  }

  // --- Composition image par image ----------------------------------------
  renderer.render = async (canvas, ctx) => {
    if (disposed || canvas.width === 0 || canvas.height === 0) return

    imagesReceived += 1
    imagesInWindow += 1
    lastImageAt = performance.now()
    sampleRates()

    try {
      const frameWidth = canvas.width
      const frameHeight = canvas.height
      const workSize = normalizedWorkSize(frameWidth, frameHeight)
      if (workSize.width === 0) return

      if (work.width !== workSize.width || work.height !== workSize.height) {
        work.width = workSize.width
        work.height = workSize.height
        person.width = Math.min(workSize.width, PERSON_MAX_WIDTH)
        person.height = Math.round((person.width * frameHeight) / frameWidth)
        backdrop.width = Math.max(16, Math.round(workSize.width / BLUR_DIVISOR))
        backdrop.height = Math.max(16, Math.round(workSize.height / BLUR_DIVISOR))
      }

      // La silhouette est copiée **avant** de repeindre le fond : à cet instant,
      // le canevas du SDK contient encore l'image nette de la caméra.
      personCtx.globalCompositeOperation = 'source-over'
      personCtx.clearRect(0, 0, person.width, person.height)
      personCtx.drawImage(canvas, 0, 0, person.width, person.height)

      // Détourage espacé : le masque précédent reste valable quelques images.
      const now = performance.now()
      if (!segmenting && now - lastSegmentAt >= SEGMENT_INTERVAL_MS) {
        segmenting = true
        lastSegmentAt = now
        workCtx.drawImage(canvas, 0, 0, workSize.width, workSize.height)

        void segmenter
          .send({ image: work })
          .catch(() => {
            // Un échec ponctuel est ignoré : l'image suivante retente et le
            // dernier masque reste valable. Après un premier masque, l'effet
            // reste donc visible même si le moteur hoquette.
          })
          .finally(() => {
            segmenting = false
          })
      }

      // Tant qu'aucun masque n'est disponible, l'image reste nette : mieux vaut
      // une caméra normale qu'un flou intégral pris pour un bug.
      if (!maskReady) return

      // 1. Fond : réduction puis agrandissement lissé (flou peu coûteux, sans
      //    dépendre du filtre canvas de `ctx.filter`).
      backdropCtx.imageSmoothingEnabled = true
      backdropCtx.imageSmoothingQuality = 'high'
      backdropCtx.drawImage(canvas, 0, 0, backdrop.width, backdrop.height)

      ctx.save()
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(backdrop, 0, 0, frameWidth, frameHeight)
      ctx.restore()

      // 2. Silhouette nette, découpée par le masque.
      personCtx.globalCompositeOperation = 'destination-in'
      personCtx.imageSmoothingEnabled = true
      personCtx.filter = `blur(${FEATHER_PX}px)`
      personCtx.drawImage(mask, 0, 0, person.width, person.height)
      personCtx.filter = 'none'
      personCtx.globalCompositeOperation = 'source-over'

      ctx.drawImage(person, 0, 0, frameWidth, frameHeight)
      imagesBlurred += 1
      failures = 0
    } catch {
      failures += 1
      // Le SDK intercepte les erreurs du middleware sans les remonter : c'est
      // ici, et seulement ici, que l'utilisateur peut être prévenu.
      if (failures >= 3) {
        renderer.dispose()
        renderer.onFailure?.(
          "Le flou d'arrière-plan s'est arrêté : votre caméra est de nouveau diffusée sans effet.",
        )
      }
    }
  }

  return renderer
}

/**
 * Middleware **stable** : le SDK identifie un middleware par sa référence, donc
 * la même fonction doit être utilisée pour l'ajouter et le retirer.
 */
const blurMiddleware: VideoMiddleware = () => {
  const renderer = activeRenderer
  if (!renderer) {
    return Promise.reject(new Error('background-blur: no renderer prepared'))
  }
  return Promise.resolve(renderer.render)
}

/** Rendu actuellement rattaché au middleware (aucun si l'effet est inactif). */
let activeRenderer: BackgroundBlurRenderer | null = null

/** Diagnostic courant, lu par le panneau « Effets de fond ». */
export function readVideoEffectStats(): VideoEffectStats | null {
  return activeRenderer ? activeRenderer.stats() : null
}

/** Média minimal nécessaire pour piloter l'effet et vérifier son application. */
type EffectMedia = Pick<
  RTKSelfMedia,
  'addVideoMiddleware' | 'removeVideoMiddleware' | 'videoTrack' | 'rawVideoTrack' | 'videoEnabled'
>

function safeRead<T>(read: () => T): T | null {
  try {
    return read()
  } catch {
    // Les accesseurs du SDK lèvent tant que le média n'est pas initialisé.
    return null
  }
}

/** Attend qu'au moins une image atteigne le traitement. */
async function waitForFirstFrame(renderer: BackgroundBlurRenderer): Promise<boolean> {
  const deadline = performance.now() + FRAME_ARRIVAL_TIMEOUT_MS
  while (performance.now() < deadline) {
    if (renderer.stats().imagesReceived > 0) return true
    await new Promise<void>((resolve) => setTimeout(resolve, 200))
  }
  return renderer.stats().imagesReceived > 0
}

/** Fabrique de rendu, injectable pour les tests de non-régression. */
export type BlurRendererFactory = () => Promise<BackgroundBlurRenderer>

/** Applique (ou retire) l'effet vidéo sur le support média du SDK. */
export async function applyVideoEffect(
  media: EffectMedia,
  effect: VideoEffectId,
  onRuntimeFailure?: (message: string) => void,
): Promise<void> {
  return applyVideoEffectWith(media, effect, createBackgroundBlurRenderer, onRuntimeFailure)
}

/**
 * Cœur de l'application de l'effet, avec une fabrique de rendu injectable.
 *
 * La fabrique permet de vérifier le comportement exact qui échouait en Phase
 * 2.1 : un SDK qui répond « succès » tout en republiant la piste brute.
 */
export async function applyVideoEffectWith(
  media: EffectMedia,
  effect: VideoEffectId,
  createRenderer: BlurRendererFactory,
  onRuntimeFailure?: (message: string) => void,
): Promise<void> {
  if (effect === 'none') {
    await media.removeVideoMiddleware(blurMiddleware)
    activeRenderer?.dispose()
    activeRenderer = null
    return
  }

  // Effet déjà en place : rien à refaire (le SDK refuserait le doublon).
  if (activeRenderer) return

  const renderer = await createRenderer()

  renderer.onFailure = (message) => {
    if (activeRenderer === renderer) activeRenderer = null
    void media.removeVideoMiddleware(blurMiddleware).catch(() => {
      // Le retrait peut échouer si le SDK a déjà remplacé sa piste : l'effet
      // est de toute façon arrêté côté rendu.
    })
    onRuntimeFailure?.(message)
  }

  activeRenderer = renderer

  const stopAndFail = async (message: string): Promise<never> => {
    if (activeRenderer === renderer) activeRenderer = null
    renderer.dispose()
    await media.removeVideoMiddleware(blurMiddleware).catch(() => {
      // Idem : le retrait est un nettoyage, pas une condition de succès.
    })
    throw new VideoEffectError(message)
  }

  const result = await media.addVideoMiddleware(blurMiddleware)

  if (!result.success) {
    // Une double application n'est pas une panne : le SDK renvoie un message
    // explicite et l'effet est déjà en place.
    if (/already/i.test(result.message ?? '')) return

    await stopAndFail(
      "Le flou d'arrière-plan n'a pas pu être activé sur ce navigateur. Votre caméra reste diffusée sans effet.",
    )
  }

  // Le SDK applique un middleware en silence : si la fabrication échoue, il
  // republie la piste brute tout en répondant `success: true`. On vérifie donc
  // que la piste publiée n'est plus la piste d'origine.
  const videoEnabled = safeRead(() => media.videoEnabled) ?? false
  if (!videoEnabled) return

  const published = safeRead(() => media.videoTrack)
  const raw = safeRead(() => media.rawVideoTrack)

  if (published && raw && published.id === raw.id) {
    await stopAndFail(
      "Le SDK n'a pas appliqué le traitement vidéo : votre caméra reste diffusée sans effet. Essayez de couper puis de rallumer la caméra.",
    )
  }

  // Dernier contrôle : les images arrivent-elles réellement au traitement ?
  const framesArrived = await waitForFirstFrame(renderer)
  if (!framesArrived) {
    await stopAndFail(
      "Le traitement n'a reçu aucune image de votre caméra. Votre caméra reste diffusée sans effet : coupez puis rallumez la vidéo, puis réessayez.",
    )
  }
}
