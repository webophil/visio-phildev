/**
 * Défilement du fil de discussion.
 *
 * Une liste est considérée comme « collée » au dernier message tant que
 * l'utilisateur reste à proximité du bas. Au-delà, il lit volontairement des
 * messages plus anciens : l'arrivée d'un nouveau message ne doit alors pas lui
 * imposer un retour en bas.
 */

/** Tolérance en pixels sous laquelle la liste est considérée en bas. */
export const CHAT_BOTTOM_THRESHOLD = 32

export interface ChatScrollMetrics {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

/** Vrai si la position courante est au bas de la liste (à la tolérance près). */
export function isScrolledToBottom(
  { scrollTop, scrollHeight, clientHeight }: ChatScrollMetrics,
  threshold: number = CHAT_BOTTOM_THRESHOLD,
): boolean {
  return scrollHeight - scrollTop - clientHeight <= threshold
}
