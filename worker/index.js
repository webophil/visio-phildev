/**
 * Worker minimal de publication (Phase 1 — statique uniquement).
 *
 * Rôle : servir l'artefact `dist/` via le binding `ASSETS` et garantir le repli
 * SPA des routes de l'application (`/rdv-aurore`, un lien d'invitation partagé,
 * un rafraîchissement de page…).
 *
 * Le repli est volontairement restreint aux **navigations** : une ressource
 * absente (JavaScript, CSS, image, police, source map) doit conserver son
 * statut 404, sinon une erreur de livraison est masquée par une page HTML 200.
 *
 * Une requête est considérée comme une navigation d'application si :
 *   1. la méthode est GET ou HEAD ;
 *   2. le dernier segment du chemin ne ressemble pas à un fichier (`/assets/x.js`) ;
 *   3. le client annonce une navigation — `Sec-Fetch-Mode: navigate`, signal
 *      envoyé par tous les navigateurs modernes pour une navigation, ou, en
 *      l'absence de ce signal, un en-tête `Accept` contenant `text/html`.
 *
 * Les chargements de ressources ne remplissent jamais ces conditions :
 * `<script src>` et `fetch()` annoncent un type générique (en-tête `Accept` réduit
 * à l'étoile), `<link rel=stylesheet>` annonce `text/css`, une `<img>` annonce
 * `image/...` — aucun ne demande `text/html`, et `Sec-Fetch-Mode` y vaut
 * `script`, `cors`, `style`, `image`… jamais `navigate`.
 *
 * Aucune logique métier, aucun secret, aucune requête sortante.
 */

/** Méthodes pour lesquelles un repli vers `index.html` a un sens. */
const FALLBACK_METHODS = new Set(['GET', 'HEAD'])

/** Dernier segment de chemin ressemblant à un fichier (`index-abc123.js`). */
const FILE_LIKE_SEGMENT = /\.[a-z0-9]+$/i

/**
 * Vrai si la requête est une navigation de l'application (et non la demande
 * d'une ressource précise).
 */
function isAppNavigation(request) {
  if (!FALLBACK_METHODS.has(request.method)) return false

  const pathname = new URL(request.url).pathname
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1)
  if (FILE_LIKE_SEGMENT.test(lastSegment)) return false

  const fetchMode = request.headers.get('Sec-Fetch-Mode')
  if (fetchMode !== null) return fetchMode === 'navigate'

  // Clients sans `Sec-Fetch-Mode` (curl, navigateurs anciens) : on se rabat sur
  // la négociation de contenu. Un `Accept` absent vaut `*/*` côté HTTP.
  return (request.headers.get('Accept') ?? '').includes('text/html')
}

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)

    // Ressource servie, redirection, erreur autre que » introuvable ¹ :
    // la réponse de la couche assets fait foi.
    if (response.status !== 404) return response

    // Ressource absente : le 404 est conservé tel quel.
    if (!isAppNavigation(request)) return response

    // Route de l'application absente du disque : c'est l'entrée de l'interface.
    const indexUrl = new URL('/', request.url)
    return env.ASSETS.fetch(new Request(indexUrl, request))
  },
}
