import { MEETING_PATH_PREFIX } from './ids'

/** Chemin interne d'une réunion, ex. `/rdv-aurore`. */
export function meetingPath(meetingId: string): string {
  return `${MEETING_PATH_PREFIX}${meetingId}`
}

/**
 * URL publique complète à partager avec un participant.
 * En Phase 1 elle pointe vers l'appareil courant : aucune salle distante
 * n'existe encore (voir `PHASE_2.meetingLinks`).
 */
export function buildMeetingUrl(meetingId: string, origin?: string): string {
  const base = (origin ?? window.location.origin).replace(/\/+$/, '')
  return `${base}${meetingPath(meetingId)}`
}

/** Durée de réunion lisible : `04:12` ou `01:04:12`. */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}

/** Accord simple pour les compteurs (« 1 participant », « 2 participants »). */
export function pluralize(count: number, singular: string, plural: string): string {
  return count > 1 ? plural : singular
}
