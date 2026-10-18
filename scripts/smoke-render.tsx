import type RTKClient from '@cloudflare/realtimekit'
import type { RTKParticipant } from '@cloudflare/realtimekit'
import { RealtimeKitContext } from '@cloudflare/realtimekit-react'
import { renderToStaticMarkup } from 'react-dom/server'

import { RemoteAudioSinks } from '../src/components/meeting/RemoteAudio'
import { UnknownRouteScreen } from '../src/components/screens/UnknownRouteScreen'
import { WelcomeScreen } from '../src/components/screens/WelcomeScreen'
import { remoteAudioTracks } from '../src/media/remoteAudio'
import { createMeetingId, generateUuid, isRealtimeKitId, meetingDisplayName, parseMeetingInput } from '../src/lib/ids'
import { mediaFailure } from '../src/lib/mediaErrors'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

import {
  BLUR_ENGINE_SCRIPT_URL,
  VideoEffectError,
  applyPersonMask,
  applyVideoEffect,
  applyVideoEffectWith,
  maskOpacity,
  maskValueForPixel,
  normalizedWorkSize,
  readVideoEffectStats,
} from '../src/media/backgroundBlur'
import { DEFAULT_MEETING_TITLE, MAX_MEETING_TITLE_LENGTH, normalizeMeetingTitle } from '../src/lib/meetingTitle'
import { MeetingApiError } from '../src/meeting/rtkApi'
import { describeChatError, describeSessionError } from '../src/meeting/rtkErrors'
import {
  buildInvitationUrl,
  buildMeetingUrl,
  formatClockTime,
  formatDuration,
  meetingPath,
  parseMeetingLink,
} from '../src/lib/format'
import { parsePath, readRealtimeKitId } from '../src/lib/router'

const checks: { name: string; run: () => void | Promise<void> }[] = []

function expect(condition: boolean, label: string) {
  if (!condition) throw new Error(`ÉCHEC : ${label}`)
  console.log(`  ok  ${label}`)
}

function countOf(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

const UUID = '497f6eca-6276-4993-bfeb-53cbbbba6f08'

// --- Routeur -------------------------------------------------------------
checks.push({
  name: 'routeur',
  run: () => {
    expect(parsePath('/').name === 'welcome', '« / » → accueil')
    expect(parsePath('/rdv-aurore').name === 'meeting', '« /rdv-aurore » → réunion')
    const route = parsePath('/rdv-aurore')
    expect(route.name === 'meeting' && route.meetingId === 'aurore', 'identifiant extrait')
    expect(parsePath('/rdv-').name === 'unknown', 'identifiant vide rejeté')
    const trailing = parsePath('/rdv-aurore/')
    expect(
      trailing.name === 'meeting' && trailing.meetingId === 'aurore',
      'barre oblique finale tolérée',
    )
    expect(parsePath('/rdv-ab').name === 'meeting', 'identifiant de 2 caractères accepté')
    expect(parsePath('/inconnu').name === 'unknown', 'route inconnue détectée')

    const withLink = parsePath('/rdv-aurore', `?r=${UUID}`)
    expect(
      withLink.name === 'meeting' && withLink.realtimeKitId === UUID,
      'identifiant Cloudflare lu depuis le lien',
    )
    const badLink = parsePath('/rdv-aurore', '?r=pas-un-uuid')
    expect(
      badLink.name === 'meeting' && badLink.realtimeKitId === null,
      'identifiant Cloudflare invalide ignoré',
    )
    expect(readRealtimeKitId(`?autre=1&r=${UUID}`) === UUID, 'paramètre retrouvé parmi d’autres')
    expect(readRealtimeKitId('') === null, 'aucun paramètre → null')
  },
})

// --- Identifiants --------------------------------------------------------
checks.push({
  name: 'identifiants',
  run: () => {
    expect(parseMeetingInput('aurore') === 'aurore', 'identifiant simple')
    expect(parseMeetingInput('rdv-aurore') === 'aurore', 'préfixe rdv- retiré')
    expect(parseMeetingInput('/rdv-aurore') === 'aurore', 'chemin interne accepté')
    expect(
      parseMeetingInput('https://visio.phildev.online/rdv-aurore?x=1') === 'aurore',
      'URL complète avec paramètres',
    )
    expect(parseMeetingInput('   ') === null, 'saisie vide rejetée')
    expect(parseMeetingInput('!!') === null, 'caractères invalides rejetés')
    expect(meetingPath('aurore') === '/rdv-aurore', 'chemin de réunion')

    const generated = createMeetingId()
    expect(generated.length === 7, 'identifiant généré de 7 caractères')
    expect(/^[a-z0-9]+$/.test(generated), 'identifiant généré alphanumérique')
    expect(createMeetingId() !== generated, 'deux identifiants générés diffèrent')
    expect(meetingDisplayName('aurore') === 'Aurore', 'nom affiché capitalisé')
    expect(
      meetingDisplayName('visio-client-dupont') === 'Visio Client Dupont',
      'nom affiché multi-mots',
    )

    expect(isRealtimeKitId(UUID), 'UUID Cloudflare reconnu')
    expect(!isRealtimeKitId('rdv-aurore'), 'identifiant lisible refusé comme UUID')
    expect(!isRealtimeKitId(null), 'valeur absente refusée')

    const uuid = generateUuid()
    expect(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid),
      'UUID v4 généré conforme',
    )
    expect(generateUuid() !== uuid, 'deux UUID générés diffèrent')
  },
})

// --- Formatage -----------------------------------------------------------
checks.push({
  name: 'formatage',
  run: () => {
    expect(formatDuration(0) === '00:00', 'durée nulle')
    expect(formatDuration(252_000) === '04:12', 'durée en minutes')
    expect(formatDuration(3_852_000) === '01:04:12', 'durée avec heures')
    expect(formatDuration(-5000) === '00:00', 'durée négative bornée')
    expect(
      buildMeetingUrl('aurore', 'https://visio.phildev.online/') ===
        'https://visio.phildev.online/rdv-aurore',
      'URL publique sans identifiant Cloudflare',
    )
    expect(
      buildInvitationUrl('aurore', UUID, 'https://visio.phildev.online/') ===
        `https://visio.phildev.online/rdv-aurore?r=${UUID}`,
      'lien d’invitation complet',
    )

    expect(formatClockTime(new Date(2026, 0, 5, 14, 7).getTime()) === '14:07', 'heure d’un message')
    expect(formatClockTime(new Date(2026, 0, 5, 9, 3, 30).getTime()) === '09:03', 'heure à un chiffre complétée')
    expect(formatClockTime(Number.NaN) === '--:--', 'horodatage invalide neutre')
  },
})

// --- Nom de la réunion ---------------------------------------------------
checks.push({
  name: 'nom de réunion',
  run: () => {
    expect(normalizeMeetingTitle('') === DEFAULT_MEETING_TITLE, 'champ vide → nom par défaut')
    expect(normalizeMeetingTitle('   ') === DEFAULT_MEETING_TITLE, 'espaces seuls → nom par défaut')
    expect(normalizeMeetingTitle(undefined) === DEFAULT_MEETING_TITLE, 'absence → nom par défaut')
    expect(
      normalizeMeetingTitle('  Rendez-vous   Aurore Studer ') === 'Rendez-vous Aurore Studer',
      'espaces réduits',
    )
    expect(
      normalizeMeetingTitle('x'.repeat(200)).length === MAX_MEETING_TITLE_LENGTH,
      'longueur bornée',
    )
    expect(DEFAULT_MEETING_TITLE === 'Réunion PhilDEV', 'nom par défaut attendu par l’interface')
  },
})

// --- Flou d'arrière-plan -------------------------------------------------
checks.push({
  name: 'flou d’arrière-plan',
  run: () => {
    expect(
      normalizedWorkSize(1280, 720).width === 480 && normalizedWorkSize(1280, 720).height === 270,
      'plan de travail réduit à 480 px de large',
    )
    expect(
      normalizedWorkSize(320, 240).width === 320 && normalizedWorkSize(320, 240).height === 240,
      'petite image conservée telle quelle',
    )
    const odd = normalizedWorkSize(641, 361)
    expect(odd.width % 2 === 0 && odd.height % 2 === 0, 'dimensions paires (pas de couture)')
    expect(normalizedWorkSize(0, 0).width === 0, 'image absente → aucun traitement')

    // Le moteur doit être servi par l'application : jamais un CDN.
    expect(
      BLUR_ENGINE_SCRIPT_URL.startsWith('/vendor/mediapipe/selfie_segmentation/'),
      'moteur servi depuis notre propre origine',
    )
    expect(
      BLUR_ENGINE_SCRIPT_URL.endsWith('/selfie_segmentation.js'),
      'script du moteur identifié',
    )

    // Régression réelle (Phase 2.1) : importé dans le bundle, ce paquet ne
    // publie **aucun** export ES — `import { SelfieSegmentation }` valait
    // `undefined`, le middleware levait et le SDK republiait la piste brute en
    // répondant « succès ». Chargé comme un script classique, il publie bien
    // son constructeur sur l'objet global.
    const engineSource = readFileSync(
      new URL(
        '../node_modules/@mediapipe/selfie_segmentation/selfie_segmentation.js',
        import.meta.url,
      ),
      'utf8',
    )
    const sandbox: Record<string, unknown> = { console }
    vm.runInNewContext(engineSource, sandbox, { filename: 'selfie_segmentation.js' })
    expect(
      typeof sandbox.SelfieSegmentation === 'function',
      'le script du moteur publie son constructeur global',
    )
  },
})

// --- Masque de segmentation ----------------------------------------------
checks.push({
  name: 'masque de segmentation',
  run: () => {
    // MediaPipe écrit `vec4(m, 0, 0, m)` : rouge et alpha portent la même valeur.
    expect(maskValueForPixel(255, 255) === 255, 'personne lue à 255 (rouge = alpha)')
    expect(maskValueForPixel(0, 0) === 0, 'fond lu à 0')
    expect(maskValueForPixel(128, 128) === 128, 'contour progressif conservé')
    expect(maskValueForPixel(200, 255) === 200, 'alpha aplati → rouge utilisé')

    // La rampe rend le premier plan totalement net sans toucher au flou du fond.
    expect(maskOpacity(0) === 0, 'fond → totalement transparent')
    expect(maskOpacity(255) === 255, 'personne → totalement opaque')
    expect(maskOpacity(26) === 0, 'bruit de fond éliminé')
    expect(maskOpacity(153) === 255, 'silhouette franche rendue nette à 60 %')

    // Masque synthétique 8×8 : silhouette 4×4 au centre, fond autour.
    const size = 8
    const mask = new Uint8ClampedArray(size * size * 4)
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const index = (y * size + x) * 4
        const inPerson = x >= 2 && x < 6 && y >= 2 && y < 6
        // Encodage réel de MediaPipe : [m, 0, 0, m]
        mask[index] = inPerson ? 255 : 0
        mask[index + 3] = inPerson ? 255 : 0
      }
    }

    const coverage = applyPersonMask(mask)
    expect(Math.abs(coverage - 0.25) < 0.001, 'couverture = 25 % de l’image')

    const alphaAt = (x: number, y: number) => mask[(y * size + x) * 4 + 3]
    expect(alphaAt(4, 4) === 255, 'centre → premier plan opaque')
    expect(alphaAt(0, 0) === 0, 'coin → arrière-plan')
    expect(alphaAt(2, 2) === 255, 'bord de la silhouette conservé')

    // Composition de référence : la personne nette recouvre le fond flou.
    const sharp = 200
    const blurred = 40
    const compose = (alpha: number) => Math.round((sharp * alpha + blurred * (255 - alpha)) / 255)
    expect(compose(alphaAt(4, 4)) === sharp, 'centre : image nette, pas le fond flou')
    expect(compose(alphaAt(0, 0)) === blurred, 'coin : fond flou conservé')
    expect(compose(alphaAt(7, 7)) === blurred, 'second coin : fond flou conservé')
  },
})

// --- Application de l'effet vidéo ----------------------------------------
checks.push({
  name: 'application du flou',
  run: async () => {
    /** Faux support média : le SDK y répond « succès » quoi qu'il arrive. */
    const createFakeMedia = (silentFallback: boolean) => {
      const raw = { id: 'raw-track' } as unknown as MediaStreamTrack
      const processed = { id: 'processed-track' } as unknown as MediaStreamTrack
      let applied = false
      let removals = 0

      return {
        media: {
          videoEnabled: true,
          get videoTrack() {
            return applied && !silentFallback ? processed : raw
          },
          get rawVideoTrack() {
            return raw
          },
          async addVideoMiddleware() {
            applied = true
            return { success: true, message: 'Successfully added the middleware.' }
          },
          async removeVideoMiddleware() {
            applied = false
            removals += 1
            return { success: true, message: 'Successfully removed the middleware.' }
          },
        },
        removals: () => removals,
      }
    }

    const createFakeRenderer = async () => ({
      render: async () => {},
      stats: () => ({
        imagesReceived: 3,
        personCoverage: 0.4,
        imagesBlurred: 3,
        masks: 2,
        imagesPerSecond: 20,
        masksPerSecond: 14,
        lastImageAgoMs: 50,
      }),
      dispose: () => {},
    })

    // Cas réellement observé en Phase 2.1 : le SDK répond « succès », garde le
    // middleware, mais republie la piste brute (sa fabrication a échoué en
    // silence). L'interface affichait alors « Flou · Actif » sans effet.
    const silent = createFakeMedia(true)
    let rejection: unknown = null
    try {
      await applyVideoEffectWith(silent.media, 'blur', createFakeRenderer)
    } catch (error) {
      rejection = error
    }

    expect(rejection instanceof VideoEffectError, 'piste brute non substituée → échec explicite')
    expect(
      rejection instanceof Error && rejection.message.includes("n'a pas appliqué"),
      'message explicite pour l’utilisateur',
    )
    expect(silent.removals() === 1, 'middleware retiré après échec')
    expect(readVideoEffectStats() === null, 'aucun rendu fantôme conservé')

    const working = createFakeMedia(false)
    await applyVideoEffectWith(working.media, 'blur', createFakeRenderer)
    expect(readVideoEffectStats()?.imagesBlurred === 3, 'compteurs de traitement exposés')
    await applyVideoEffect(working.media, 'none')
    expect(readVideoEffectStats() === null, '« Aucun effet » libère le traitement')
    expect(working.removals() === 1, 'middleware retiré explicitement')
  },
})

// --- Analyse d'un lien d'invitation --------------------------------------
checks.push({
  name: 'lien d’invitation',
  run: () => {
    const full = parseMeetingLink(`https://visio.phildev.online/rdv-aurore?r=${UUID}`)
    expect(
      full !== null && full.meetingId === 'aurore' && full.realtimeKitId === UUID,
      'lien complet analysé',
    )

    const bare = parseMeetingLink('rdv-aurore')
    expect(bare !== null && bare.meetingId === 'aurore' && bare.realtimeKitId === null, 'identifiant seul accepté')

    const invalidLink = parseMeetingLink('https://visio.phildev.online/rdv-aurore?r=xyz')
    expect(
      invalidLink !== null && invalidLink.realtimeKitId === null,
      'paramètre invalide neutralisé',
    )

    expect(parseMeetingLink('   ') === null, 'saisie vide rejetée')
    expect(parseMeetingLink('!!!') === null, 'saisie invalide rejetée')
  },
})

// --- Erreurs : API et périphériques --------------------------------------
checks.push({
  name: 'erreurs',
  run: () => {
    const invalidToken = describeSessionError({ code: '0004', name: 'ClientError' })
    expect(invalidToken.canRetry, 'jeton invalide : nouvelle tentative proposée')
    expect(
      invalidToken.message.includes('plus valide'),
      'jeton invalide : message explicite',
    )

    const unsupported = describeSessionError({ code: '0010' })
    expect(!unsupported.canRetry, 'navigateur non pris en charge : pas de relance')
    expect(unsupported.message.includes('navigateur'), 'message orienté navigateur')

    const network = describeSessionError({ code: '0012' })
    expect(network.canRetry, 'coupure réseau : relance possible')

    const denied = describeSessionError(new DOMException('refus', 'NotAllowedError'))
    expect(
      denied.message.includes('refusé') && denied.canRetry,
      'permission refusée traduite en français',
    )

    const busy = describeSessionError(new DOMException('occupé', 'NotReadableError'))
    expect(busy.message.includes('déjà utilisé'), 'périphérique occupé expliqué')

    const full = describeSessionError(
      new MeetingApiError({ status: 409, code: 'meeting-full', message: 'Réunion complète' }),
    )
    expect(!full.canRetry, 'réunion complète : relance inutile')
    expect(full.message === 'Réunion complète', 'message du serveur conservé')

    const unauthorized = describeSessionError(
      new MeetingApiError({ status: 401, code: 'host-unauthorized', message: 'Accès requis' }),
    )
    expect(!unauthorized.canRetry, 'refus d\u2019autorisation : pas de relance automatique')

    const offline = describeSessionError(
      new MeetingApiError({ status: 0, code: 'network', message: 'Serveur injoignable' }),
    )
    expect(offline.canRetry && offline.message.includes('injoignable'), 'réseau absent expliqué')

    const unknown = describeSessionError(undefined)
    expect(unknown.code === 'unknown' && unknown.canRetry, 'erreur inconnue traitée')

    expect(mediaFailure('permission-denied').canRetry, 'échec matériel : permission réessayable')
    expect(
      mediaFailure('unsupported').canRetry === false,
      'API média absente : aucune relance proposée',
    )
    expect(mediaFailure('no-device').title.includes('Aucun périphérique'), 'matériel absent expliqué')

    expect(
      describeChatError({ code: '1101' }).includes('autorise pas'),
      'chat refusé par le profil expliqué',
    )
    expect(describeChatError({ code: '0013' }).includes('Trop de messages'), 'limite de débit expliquée')
    expect(
      describeChatError({ code: '0012' }).includes('connexion'),
      'coupure pendant l’envoi expliquée',
    )
    expect(describeChatError(undefined).includes('Réessayez'), 'échec inconnu : message actionnable')
  },
})

// --- Audio des participants distants -------------------------------------
checks.push({
  name: 'audio distant',
  run: () => {
    const track = (id: string) => ({ id }) as MediaStreamTrack

    const speaking = remoteAudioTracks({ audioEnabled: true, audioTrack: track('voix-a') })
    expect(
      speaking.length === 1 && speaking[0].id === 'voix-a',
      'micro actif → une piste restituée',
    )

    const muted = remoteAudioTracks({ audioEnabled: false, audioTrack: track('voix-b') })
    expect(muted.length === 0, 'micro coupé → aucune piste restituée')

    const noTrackYet = remoteAudioTracks({ audioEnabled: true, audioTrack: null })
    expect(noTrackYet.length === 0, 'piste pas encore reçue → rien à restituer')

    const sharing = remoteAudioTracks({
      audioEnabled: true,
      audioTrack: track('voix-c'),
      screenShareEnabled: true,
      screenShareTracks: { audio: track('son-partage') },
    })
    expect(
      sharing.length === 2 && sharing.some((item) => item.id === 'son-partage'),
      'son du partage d’écran ajouté à la voix',
    )

    const duplicated = remoteAudioTracks({
      audioEnabled: true,
      audioTrack: track('voix-d'),
      screenShareEnabled: true,
      screenShareTracks: { audio: track('voix-d') },
    })
    expect(duplicated.length === 1, 'une même piste n’est jamais restituée deux fois')

    const sharingMuted = remoteAudioTracks({
      audioEnabled: false,
      audioTrack: track('voix-e'),
      screenShareEnabled: true,
      screenShareTracks: { audio: track('son-partage-2') },
    })
    expect(
      sharingMuted.length === 1 && sharingMuted[0].id === 'son-partage-2',
      'partage sonore audible malgré un micro coupé',
    )

    const noShareAudio = remoteAudioTracks({
      audioEnabled: true,
      audioTrack: track('voix-f'),
      screenShareEnabled: true,
      screenShareTracks: null,
    })
    expect(noShareAudio.length === 1, 'partage sans son → voix seule')
  },
})

// --- Sortie audio montée dans la salle -----------------------------------
checks.push({
  name: 'sortie audio des participants',
  run: () => {
    const guest = (id: string) =>
      ({
        id,
        name: id,
        isHost: false,
        audioEnabled: true,
        videoEnabled: false,
        screenShareEnabled: false,
      }) as unknown as RTKParticipant

    const withParticipants = (participants: RTKParticipant[]) =>
      ({
        participants: { joined: { toArray: () => participants } },
      }) as unknown as RTKClient

    const render = (participants: RTKParticipant[]) =>
      renderToStaticMarkup(
        <RealtimeKitContext.Provider
          value={{ meeting: withParticipants(participants), updates: undefined }}
        >
          <RemoteAudioSinks />
        </RealtimeKitContext.Provider>,
      )

    const twoGuests = render([guest('invite-1'), guest('invite-2')])
    expect(countOf(twoGuests, '<audio') === 2, 'un élément de lecture par participant distant')
    // React émet `autoPlay` en SSR ; la casse n'a pas d'importance, seule la
    // présence de la demande de lecture compte.
    expect(/autoplay/i.test(twoGuests), 'lecture automatique demandée sur chaque sortie')
    expect(!twoGuests.includes('muted'), 'aucune sortie distante n’est coupée')
    expect(!twoGuests.includes('Activer le son'), 'aucun avertissement sans blocage constaté')

    const alone = render([])
    expect(countOf(alone, '<audio') === 0, 'personne à écouter → aucune sortie')
  },
})

// --- Rendu des écrans ----------------------------------------------------
checks.push({
  name: 'écran d’accueil',
  run: () => {
    const html = renderToStaticMarkup(<WelcomeScreen onJoinMeeting={() => {}} />)
    expect(html.includes('Vos rendez-vous,'), 'slogan présent')
    expect(html.includes('Créer une réunion'), 'bouton de création')
    expect(html.includes('Rejoindre'), 'bouton rejoindre')
    expect(html.includes('Lien d’invitation'), 'champ de lien')
    expect(html.includes('Accès organisateur'), 'accès protégé de l’organisateur')
    expect(html.includes('Nom de la réunion'), 'champ du nom de réunion')
    expect(html.includes(DEFAULT_MEETING_TITLE), 'nom de réunion par défaut proposé')
    expect(html.includes('PhilDEV'), 'marque PhilDEV')
    expect(html.includes('Visio'), 'marque Visio')
    expect(html.includes('lang="fr"') === false, 'aucun attribut parasite')
    expect(html.length > 2000, 'markup non trivial')
  },
})

checks.push({
  name: 'route inconnue',
  run: () => {
    const html = renderToStaticMarkup(<UnknownRouteScreen path="/inconnu" onGoHome={() => {}} />)
    expect(html.includes('Page introuvable'), 'titre de page introuvable')
    expect(html.includes('/inconnu'), 'chemin affiché')
  },
})

let failures = 0
for (const check of checks) {
  console.log(`\n▶ ${check.name}`)
  try {
    await check.run()
  } catch (error) {
    failures += 1
    console.error(`  ✗ ${(error as Error).message}`)
  }
}

console.log(`\n${checks.length - failures}/${checks.length} groupes de vérifications réussis`)
if (failures > 0) process.exit(1)
