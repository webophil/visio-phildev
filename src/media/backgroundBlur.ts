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

/**
 * Taille du plan de travail pour une image source.
 * Bornée à `WORK_WIDTH` et conservée paire (les arrondis impairs créent des
 * coutures visibles sur certains pilotes graphiques).
 */
export function normalizedWorkSize(width: number, height: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 }

  const scale = Math.min(1, WORK_WIDTH / width)
  const scaledWidth = Math.max(2, Math.round((width * scale) / 2) * 2)
  const scaledHeight = Math.max(2, Math.round((height * scale) / 2) * 2)

  return { width: scaledWidth, height: scaledHeight }
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
 * Prépare le détourage puis renvoie la fonction de composition appliquée à
 * chaque image. Tout échec de chargement (fichiers absents, WebAssembly non pris
 * en charge) remonte ici : le SDK transforme alors l'ajout en échec explicite et
 * la caméra continue d'être diffusée normalement.
 */
export async function createBackgroundBlurRenderer(): Promise<FrameRenderer> {
  const { SelfieSegmentation } = await import('@mediapipe/selfie_segmentation')

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

  const segmenter = new SelfieSegmentation({ locateFile: (file) => `${ENGINE_PATH}/${file}` })
  // `modelSelection: 1` = modèle « paysage », adapté à une webcam 16:9.
  segmenter.setOptions({ modelSelection: 1 })

  let maskReady = false
  let segmenting = false
  let lastSegmentAt = 0
  let failed = false

  segmenter.onResults((results) => {
    const segmentationMask = results.segmentationMask as CanvasImageSource | undefined
    if (!segmentationMask || failed) return

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
  })

  await segmenter.initialize()

  return async (canvas, ctx) => {
    if (failed || canvas.width === 0 || canvas.height === 0) return

    const frameWidth = canvas.width
    const frameHeight = canvas.height
    const workSize = normalizedWorkSize(frameWidth, frameHeight)
    if (workSize.width === 0) return

    if (work.width !== workSize.width || work.height !== workSize.height) {
      const personSize = normalizedWorkSize(frameWidth, frameHeight)
      work.width = workSize.width
      work.height = workSize.height
      person.width = Math.min(personSize.width, PERSON_MAX_WIDTH)
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
          // Un échec ponctuel du graphe n'interrompt pas l'effet : l'image
          // suivante retente. Un échec durable laisse simplement la caméra nette.
          failed = maskReady === false
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
  }
}

/**
 * Middleware **stable** : le SDK identifie un middleware par sa référence, donc
 * la même fonction doit être utilisée pour l'ajouter et le retirer.
 */
const blurMiddleware: VideoMiddleware = () => createBackgroundBlurRenderer()

/** Applique (ou retire) l'effet vidéo sur le support média du SDK. */
export async function applyVideoEffect(
  media: Pick<RTKSelfMedia, 'addVideoMiddleware' | 'removeVideoMiddleware'>,
  effect: VideoEffectId,
): Promise<void> {
  if (effect === 'none') {
    await media.removeVideoMiddleware(blurMiddleware)
    return
  }

  const result = await media.addVideoMiddleware(blurMiddleware)

  if (!result.success) {
    // Une double application n'est pas une panne : le SDK renvoie un message
    // explicite et l'effet est déjà en place.
    if (/already/i.test(result.message ?? '')) return

    throw new VideoEffectError(
      "Le flou d'arrière-plan n'a pas pu être activé sur ce navigateur. Votre caméra reste diffusée sans effet.",
    )
  }
}
