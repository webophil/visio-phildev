/**
 * Session organisateur — jeton **signé**, sans base de données.
 *
 * Le secret `PHILDEV_HOST_KEY` est saisi une fois par l'organisateur, vérifié
 * par le Worker, puis remplacé par un jeton de session signé
 * (`payload.signature`, HMAC-SHA-256). Le secret lui-même n'est jamais renvoyé
 * au navigateur ni conservé côté client : seule la signature circule, et elle
 * expire.
 *
 * La vérification est à temps constant sur la signature. Aucune donnée
 * sensible n'est placée dans la charge utile : uniquement une date
 * d'expiration.
 */

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** Durée de vie par défaut d'une session organisateur : 30 jours. */
export const HOST_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

function base64UrlEncode(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(text) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function sign(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return new Uint8Array(signature)
}

/** Comparaison à temps constant (les longueurs différentes sont rejetées). */
export function timingSafeEqual(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false
  if (a.length !== b.length || a.length === 0) return false

  let difference = 0
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index]
  return difference === 0
}

/** Vrai si le secret organisateur est enregistré dans l'environnement. */
export function hasHostSecret(env) {
  return typeof env?.PHILDEV_HOST_KEY === 'string' && env.PHILDEV_HOST_KEY.length > 0
}

/**
 * Vérifie la clé organisateur saisie par l'utilisateur.
 * Toute clé absente côté Worker est un refus (jamais une acceptation).
 */
export function verifyHostKey(env, candidate) {
  if (!hasHostSecret(env)) return false
  if (typeof candidate !== 'string' || candidate.length === 0) return false

  return timingSafeEqual(encoder.encode(candidate), encoder.encode(env.PHILDEV_HOST_KEY))
}

/** Fabrique un jeton de session organisateur signé. */
export async function createHostSession(env, { ttlMs = HOST_SESSION_TTL_MS, now = Date.now() } = {}) {
  const expiresAt = now + ttlMs
  const payload = base64UrlEncode(encoder.encode(JSON.stringify({ exp: expiresAt })))
  const signature = base64UrlEncode(await sign(env.PHILDEV_HOST_KEY, payload))

  return { token: `${payload}.${signature}`, expiresAt }
}

/** Vérifie un jeton de session organisateur (signature puis expiration). */
export async function verifyHostSession(env, token, now = Date.now()) {
  if (!hasHostSecret(env)) return false
  if (typeof token !== 'string') return false

  const parts = token.split('.')
  if (parts.length !== 2) return false

  const [payload, signature] = parts
  if (payload.length === 0 || signature.length === 0) return false

  let provided
  try {
    provided = base64UrlDecode(signature)
  } catch {
    return false
  }

  if (!timingSafeEqual(provided, await sign(env.PHILDEV_HOST_KEY, payload))) return false

  try {
    const parsed = JSON.parse(decoder.decode(base64UrlDecode(payload)))
    return typeof parsed?.exp === 'number' && parsed.exp > now
  } catch {
    return false
  }
}
