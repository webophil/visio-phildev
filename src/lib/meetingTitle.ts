/**
 * Nom de réunion.
 *
 * Le nom est **facultatif** : à défaut, l'application utilise un nom par défaut
 * stable. La longueur est bornée des deux côtés (navigateur et Worker), car le
 * nom est transmis à Cloudflare RealtimeKit comme titre de la réunion puis
 * relu par tous les participants.
 */

/** Nom proposé quand l'organisateur laisse le champ vide. */
export const DEFAULT_MEETING_TITLE = 'Réunion PhilDEV'

/** Longueur maximale, identique à `MAX_TITLE_LENGTH` dans `worker/index.js`. */
export const MAX_MEETING_TITLE_LENGTH = 80

/**
 * Normalise une saisie : espaces réduits, longueur bornée, valeur par défaut si
 * le champ est vide. Le résultat est toujours affichable tel quel.
 */
export function normalizeMeetingTitle(input: string | null | undefined): string {
  const title = (input ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_MEETING_TITLE_LENGTH)
  return title.length > 0 ? title : DEFAULT_MEETING_TITLE
}
