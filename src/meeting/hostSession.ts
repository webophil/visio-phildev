/**
 * Persistance locale, volontairement limitée à deux éléments :
 *
 * 1. la **session organisateur** — un jeton signé par le Worker, avec sa date
 *    d'expiration. La clé organisateur elle-même n'est jamais conservée : elle
 *    n'est envoyée qu'une fois, pour ouvrir la session.
 * 2. l'**identifiant d'invité**, propre au navigateur et à la réunion. Il sert
 *    de `custom_participant_id` afin qu'une reconnexion ne consomme pas un
 *    nouvel emplacement dans la réunion.
 *
 * Aucun jeton de participation n'est stocké : il est redemandé à chaque entrée
 * dans la salle, puis oublié à la sortie.
 */

import { createGuestId } from '../lib/ids'

const HOST_SESSION_KEY = 'phildev-visio:host-session'
const GUEST_ID_PREFIX = 'phildev-visio:guest-id:'

export interface StoredHostSession {
  token: string
  expiresAt: number
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    // Stockage indisponible (navigation privée, quota) : l'appelant décide.
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Sans stockage, la session reste valable le temps de l'onglet.
  }
}

function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Rien à faire : l'entrée sera ignorée à la prochaine lecture.
  }
}

/** Session organisateur valide, ou `null` si absente ou expirée. */
export function readHostSession(now = Date.now()): StoredHostSession | null {
  const raw = readStorage(HOST_SESSION_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredHostSession>
    if (typeof parsed.token !== 'string' || typeof parsed.expiresAt !== 'number') return null
    if (parsed.expiresAt <= now) {
      removeStorage(HOST_SESSION_KEY)
      return null
    }
    return { token: parsed.token, expiresAt: parsed.expiresAt }
  } catch {
    removeStorage(HOST_SESSION_KEY)
    return null
  }
}

export function saveHostSession(session: StoredHostSession): void {
  writeStorage(HOST_SESSION_KEY, JSON.stringify(session))
}

export function clearHostSession(): void {
  removeStorage(HOST_SESSION_KEY)
}

/**
 * Identifiant d'invité stable pour une réunion Cloudflare donnée.
 * Il est créé à la première venue, puis réutilisé pour toutes les
 * reconnexions depuis ce navigateur.
 */
export function getOrCreateGuestId(realtimeKitId: string): string {
  const key = `${GUEST_ID_PREFIX}${realtimeKitId}`
  const existing = readStorage(key)
  if (existing && existing.length > 0) return existing

  const created = createGuestId()
  writeStorage(key, created)
  return created
}
