/**
 * Identifiants de réunion.
 *
 * L'identifiant lisible (`rdv-aurore`) nomme le rendez-vous dans l'URL ; il est
 * **distinct** de l'identifiant de réunion Cloudflare RealtimeKit (UUID), qui
 * accompagne le lien sous forme de paramètre `?r=`. Cette séparation permet aux
 * liens d'invitation de rester lisibles tout en désignant une vraie réunion
 * côté serveur.
 */

/** Paramètre de lien transportant l'identifiant de réunion RealtimeKit. */
export const MEETING_LINK_PARAM = 'r'

/** Alphanumérique sans caractères ambigus (ni l/1/i, ni o/0). */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const GENERATED_LENGTH = 7

const MEETING_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,57}[a-z0-9])?$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const MEETING_PATH_PREFIX = '/rdv-'

export const MEETING_ID_MIN_LENGTH = 2
export const MEETING_ID_MAX_LENGTH = 59

/**
 * Vrai si la valeur est un identifiant Cloudflare (UUID).
 * Sert à refuser un lien incomplet avant tout appel réseau.
 */
export function isRealtimeKitId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value.trim())
}

/** Génère un UUID v4 (repli sûr si `crypto.randomUUID` est indisponible). */
export function generateUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Identifiant d'invité, propre à un appareil et à une réunion.
 * Il sert de `custom_participant_id` : une reconnexion réutilise le même
 * emplacement, elle ne consomme pas une place supplémentaire.
 */
export function createGuestId(): string {
  return generateUuid()
}

/** Génère un identifiant local lisible, ex. `k7m2pqd`. */
export function createMeetingId(): string {
  const bytes = new Uint8Array(GENERATED_LENGTH)
  crypto.getRandomValues(bytes)

  let id = ''
  for (const byte of bytes) {
    id += ALPHABET[byte % ALPHABET.length]
  }
  return id
}

export function isValidMeetingId(value: string): boolean {
  const id = value.trim().toLowerCase()
  if (id.length < MEETING_ID_MIN_LENGTH || id.length > MEETING_ID_MAX_LENGTH) return false
  return MEETING_ID_PATTERN.test(id)
}

/**
 * Normalise une saisie utilisateur en identifiant de réunion.
 * Accepte : `aurore`, `rdv-aurore`, `/rdv-aurore`,
 * `https://visio.phildev.online/rdv-aurore`, avec ou sans paramètres.
 */
export function parseMeetingInput(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  const withoutQuery = raw.split(/[?#]/)[0] ?? ''
  const segments = withoutQuery.split('/').filter(Boolean)
  const lastSegment = segments.at(-1) ?? ''

  const candidate = lastSegment
    .toLowerCase()
    .replace(/^rdv-/, '')
    .replace(/^-+|-+$/g, '')

  if (!candidate || candidate === 'rdv') return null

  return isValidMeetingId(candidate) ? candidate : null
}

/**
 * Nom affiché d'une réunion à partir de son identifiant.
 * `aurore` → « Aurore », `visio-client-dupont` → « Visio Client Dupont »,
 * `k7m2pqd` (identifiant généré) → « Réunion k7m2pqd ».
 */
export function meetingDisplayName(meetingId: string): string {
  const base = meetingId.replace(/[-_]+/g, '-').trim()
  if (!base) return 'Réunion'

  const looksGenerated = !base.includes('-') && /\d/.test(base)
  if (looksGenerated) return `Réunion ${base}`

  const words = base.split('-').filter(Boolean)
  const formatted = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return formatted || 'Réunion'
}
