/**
 * Identifiants de réunion.
 *
 * Phase 1 : les identifiants sont créés localement et ne désignent aucune
 * session distante. Ils servent uniquement à construire une URL de rendez-vous
 * du type `/rdv-aurore`. La résolution réelle de ces identifiants (création de
 * réunion + jeton participant) sera assurée côté serveur lors de l'intégration
 * Cloudflare RealtimeKit (Phase 2) — voir `src/meeting/transport`.
 */

/** Alphanumérique sans caractères ambigus (ni l/1/i, ni o/0). */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const GENERATED_LENGTH = 7

const MEETING_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,57}[a-z0-9])?$/

export const MEETING_PATH_PREFIX = '/rdv-'

export const MEETING_ID_MIN_LENGTH = 2
export const MEETING_ID_MAX_LENGTH = 59

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
