/**
 * Limiteur de débit en mémoire (fenêtre glissante).
 *
 * Portée volontairement modeste : l'état vit dans l'instance du Worker, il
 * n'est donc **pas** partagé entre isolates ni durable. Il suffit à son
 * objectif — freiner les demandes répétées de jetons et les tentatives de clé
 * organisateur depuis une même adresse — sans introduire de base de données.
 * Une garantie stricte exigerait un compteur partagé (Durable Object ou D1).
 */

/** Au-delà de cette taille, les entrées expirées sont purgées. */
const MAX_TRACKED_KEYS = 2000

export function createRateLimiter({ limit, windowMs }) {
  const hits = new Map()

  function purge(now) {
    if (hits.size <= MAX_TRACKED_KEYS) return

    for (const [key, timestamps] of hits) {
      if (timestamps.every((at) => now - at >= windowMs)) hits.delete(key)
    }
  }

  return {
    /**
     * Enregistre une demande et indique si elle est autorisée.
     * `retryAfter` est exprimé en secondes (en-tête HTTP `Retry-After`).
     */
    check(key, now = Date.now()) {
      const previous = hits.get(key) ?? []
      const recent = previous.filter((at) => now - at < windowMs)

      if (recent.length >= limit) {
        hits.set(key, recent)
        const oldest = recent[0]
        return {
          allowed: false,
          retryAfter: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
        }
      }

      recent.push(now)
      hits.set(key, recent)
      purge(now)

      return { allowed: true, retryAfter: 0 }
    },
  }
}

/** Adresse cliente, telle que fournie par l'infrastructure Cloudflare. */
export function clientKey(request, scope) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'inconnue'
  return `${scope}:${ip}`
}
