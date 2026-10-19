/**
 * En-têtes HTTP de sécurité, appliqués à **toutes** les réponses du Worker :
 * API, assets statiques, 404 et repli SPA.
 *
 * La politique CSP complète est d'abord servie en `Report-Only` : elle ne bloque
 * rien, mais les violations apparaissent dans la console du navigateur. Cela
 * permet de vérifier les hôtes réellement utilisés par RealtimeKit (API,
 * signaling WebSocket, stockage du chat) et par MediaPipe avant de l'activer.
 *
 * Seule la protection contre l'intégration en iframe est déjà appliquée, via
 * `frame-ancestors 'none'` et `X-Frame-Options: DENY`.
 *
 * HSTS est volontairement absent : le domaine personnalisé n'est pas encore
 * validé, et un HSTS posé trop tôt serait difficile à retirer côté navigateurs.
 *
 * Limites connues de FreeBuff Sites :
 * - la plateforme injecte le beacon `static.cloudflareinsights.com` dans les
 *   documents de navigation. La CSP le bloquera volontairement (analytics
 *   désactivé) plutôt que d'autoriser un script tiers à lire `localStorage` ;
 * - `frame-ancestors 'none'` empêche aussi d'afficher la Preview Sites dans
 *   une iframe : ouvrir son URL directement dans un onglet.
 */

/**
 * Passer à `true` après validation de la Preview en conditions réelles.
 * La politique complète devient alors `Content-Security-Policy` (bloquante)
 * et le `Report-Only` disparaît.
 */
export const CSP_ENFORCED = false

/**
 * Politique destinée à l'application réelle.
 *
 * - `'wasm-unsafe-eval'` est requis par MediaPipe Selfie Segmentation ; il
 *   n'autorise pas `eval()` JavaScript.
 * - `api.realtime.cloudflare.com` couvre l'API RealtimeKit 2.0.3.
 * - `wss://*.realtime.cloudflare.com` couvre le signaling, y compris
 *   `socket-edge` si le SDK l'utilise encore.
 * - `r2.cloudflarestorage.com` est documenté pour le stockage des messages de
 *   chat ; à retirer si le test réel ne l'utilise pas.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self'",
  "connect-src 'self' https://api.realtime.cloudflare.com wss://api.realtime.cloudflare.com wss://*.realtime.cloudflare.com https://r2.cloudflarestorage.com",
  "worker-src 'self'",
  "manifest-src 'self'",
].join('; ')

/** Protection iframe minimale, active même tant que la CSP complète est en report-only. */
export const FRAME_PROTECTION_POLICY = "frame-ancestors 'none'"

/**
 * Recopie une réponse en y ajoutant les en-têtes de sécurité.
 *
 * Le corps, le statut et les en-têtes existants (Cache-Control, Content-Type,
 * Retry-After…) sont conservés : aucun comportement fonctionnel n'est modifié.
 */
export function applySecurityHeaders(response) {
  const headers = new Headers(response.headers)

  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'no-referrer')
  headers.set('X-Frame-Options', 'DENY')
  headers.set(
    'Content-Security-Policy',
    CSP_ENFORCED ? CONTENT_SECURITY_POLICY : FRAME_PROTECTION_POLICY,
  )

  if (CSP_ENFORCED) {
    headers.delete('Content-Security-Policy-Report-Only')
  } else {
    headers.set('Content-Security-Policy-Report-Only', CONTENT_SECURITY_POLICY)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
