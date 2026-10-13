/**
 * Traduction des erreurs MediaDevices en messages utilisateur en français.
 * Aucune erreur n'est masquée : chaque échec réel est expliqué à l'utilisateur.
 */

export type MediaFailureReason =
  | 'unsupported'
  | 'insecure-context'
  | 'permission-denied'
  | 'no-device'
  | 'device-busy'
  | 'constraints-unsatisfied'
  | 'interrupted'
  | 'cancelled'
  | 'unknown'

export interface MediaFailure {
  reason: MediaFailureReason
  /** Titre court, affiché en tête de l'alerte. */
  title: string
  /** Explication en français, orientée solution. */
  message: string
  /** Action proposée à l'utilisateur, si une relance a du sens. */
  canRetry: boolean
}

const MESSAGES: Record<MediaFailureReason, MediaFailure> = {
  unsupported: {
    reason: 'unsupported',
    title: 'Fonction non prise en charge',
    message:
      "Ce navigateur ne fournit pas l'API d'accès aux périphériques (navigator.mediaDevices). Utilisez une version récente de Chrome, Edge, Firefox ou Safari.",
    canRetry: false,
  },
  'insecure-context': {
    reason: 'insecure-context',
    title: 'Connexion non sécurisée',
    message:
      "L'accès à la caméra et au microphone exige une connexion HTTPS (ou localhost). Ouvrez la page via une adresse sécurisée puis réessayez.",
    canRetry: false,
  },
  'permission-denied': {
    reason: 'permission-denied',
    title: 'Accès refusé',
    message:
      "Vous avez refusé l'accès à la caméra ou au microphone. Autorisez l'accès dans les réglages du navigateur (icône à gauche de l'adresse), puis réessayez.",
    canRetry: true,
  },
  'no-device': {
    reason: 'no-device',
    title: 'Aucun périphérique détecté',
    message:
      "Aucune caméra ou aucun microphone n'a été trouvé. Branchez un périphérique et vérifiez qu'il n'est pas désactivé par le système.",
    canRetry: true,
  },
  'device-busy': {
    reason: 'device-busy',
    title: 'Périphérique indisponible',
    message:
      "Le matériel est peut-être utilisé par une autre application (visioconférence, logiciel de capture). Fermez-la puis réessayez.",
    canRetry: true,
  },
  'constraints-unsatisfied': {
    reason: 'constraints-unsatisfied',
    title: 'Périphérique incompatible',
    message:
      "Le périphérique sélectionné ne prend pas en charge les réglages demandés. Choisissez un autre micro ou une autre caméra.",
    canRetry: true,
  },
  interrupted: {
    reason: 'interrupted',
    title: 'Accès interrompu',
    message:
      "L'accès au matériel a été interrompu par le système. Vérifiez le branchement puis réessayez.",
    canRetry: true,
  },
  cancelled: {
    reason: 'cancelled',
    title: 'Sélection annulée',
    message: "La sélection a été annulée avant la fin de l'opération.",
    canRetry: true,
  },
  unknown: {
    reason: 'unknown',
    title: 'Erreur inattendue',
    message:
      "Une erreur est survenue lors de l'accès au matériel. Rechargez la page puis réessayez.",
    canRetry: true,
  },
}

function failure(reason: MediaFailureReason): MediaFailure {
  return MESSAGES[reason]
}

export function mediaDevicesSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  )
}

export function displayCaptureSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function'
  )
}

function errorName(error: unknown): string | null {
  if (error instanceof DOMException) return error.name
  if (error && typeof error === 'object' && 'name' in error) {
    const { name } = error as { name?: unknown }
    return typeof name === 'string' ? name : null
  }
  return null
}

/** Erreur rencontrée lors d'un `getUserMedia`. */
export function describeMediaError(error: unknown): MediaFailure {
  if (!mediaDevicesSupported()) return failure('unsupported')
  if (!window.isSecureContext) return failure('insecure-context')

  switch (errorName(error)) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return failure('permission-denied')
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return failure('no-device')
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return failure('device-busy')
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return failure('constraints-unsatisfied')
    case 'TypeError':
      return failure('constraints-unsatisfied')
    default:
      return failure('unknown')
  }
}

/** Erreur rencontrée lors d'un `getDisplayMedia` (partage d'écran). */
export function describeDisplayError(error: unknown): MediaFailure {
  if (!displayCaptureSupported()) {
    return {
      reason: 'unsupported',
      title: 'Partage d’écran indisponible',
      message:
        "Ce navigateur ne prend pas en charge le partage d'écran (API getDisplayMedia). Utilisez un navigateur de bureau récent — sur mobile, la fonction n'est généralement pas disponible.",
      canRetry: false,
    }
  }

  if (errorName(error) === 'AbortError' || errorName(error) === 'NotAllowedError') {
    return {
      reason: 'cancelled',
      title: 'Partage annulé',
      message: "Le partage d'écran a été annulé ou refusé. Vous pouvez le relancer à tout moment.",
      canRetry: true,
    }
  }

  return describeMediaError(error)
}

/** Message affiché lorsqu'une piste est coupée par le système (débranchement). */
export function deviceDisconnectedFailure(kind: 'audio' | 'video'): MediaFailure {
  return {
    reason: kind === 'audio' ? 'no-device' : 'interrupted',
    title: `Périphérique ${kind === 'audio' ? 'audio' : 'vidéo'} déconnecté`,
    message:
      kind === 'audio'
        ? 'Le microphone a été déconnecté ou désactivé. Rebranchez-le puis réactivez le micro.'
        : 'La caméra a été déconnectée ou désactivée. Rebranchez-la puis réactivez la caméra.',
    canRetry: true,
  }
}
