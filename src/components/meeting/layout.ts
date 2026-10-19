/**
 * Règles de mise en page de la salle de réunion.
 *
 * Elles sont centralisées ici pour trois raisons :
 *
 * 1. la scène ne compte que des **vignettes réelles** : l'emplacement vide n'est
 *    plus une cellule de grille (avec un seul participant, il occupait la moitié
 *    de la scène et créait deux bandes pleine largeur) ;
 * 2. chaque cadre a une **proportion explicite** (16:9) et une largeur maximale,
 *    au lieu d'être étiré par la ligne de grille ;
 * 3. ces règles sont vérifiées par les tests de non-régression.
 */

/**
 * Nombre de colonnes de la scène.
 *
 * 1 participant → une seule vignette, centrée ; 2 → côte à côte ; 3–4 → deux
 * colonnes ; 5 et plus → trois colonnes sur grand écran.
 */
export function stageColumns(tiles: number): 1 | 2 | 3 {
  if (tiles <= 1) return 1
  if (tiles <= 4) return 2
  return 3
}

/**
 * Classes de la grille vidéo.
 *
 * `h-full` + `min-h-0` + `overflow-hidden` : la grille occupe exactement la
 * place laissée par la colonne. Avec une ou deux vignettes, `place-items-center`
 * centre les cadres au lieu de les étirer sur toute la hauteur ; au-delà,
 * `auto-rows-fr` répartit la hauteur disponible en lignes égales.
 */
export function stageGridClass(tiles: number): string {
  const columns = stageColumns(tiles)

  if (columns === 1) {
    return 'stage-area grid h-full min-h-0 min-w-0 flex-1 grid-cols-1 place-items-center gap-4 overflow-hidden'
  }

  if (tiles === 2) {
    return [
      'grid h-full min-h-0 min-w-0 flex-1 auto-rows-fr grid-cols-1 gap-3 overflow-hidden',
      'sm:grid-cols-2',
    ].join(' ')
  }

  if (columns === 2) {
    return 'grid h-full min-h-0 min-w-0 flex-1 auto-rows-fr grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2'
  }

  return 'grid h-full min-h-0 min-w-0 flex-1 auto-rows-fr grid-cols-2 gap-3 overflow-hidden lg:grid-cols-3'
}

/**
 * Vignette vidéo.
 *
 * - seul : un cadre 16:9 dimensionné pour tenir entièrement dans la scène
 *   (`stage-frame`), centré, largeur maximale raisonnable ;
 * - à deux et plus : la vignette remplit exactement sa cellule de grille — la
 *   plus grande image possible — et c'est la vidéo qui garde ses proportions
 *   (`object-contain`), donc jamais de recadrage.
 *
 * Dans tous les cas la vidéo est en `object-contain` : l'image entière est
 * visible, centrée, sans agrandissement ni recadrage.
 */
export function stageTileClass(tiles: number): string {
  const base = 'relative overflow-hidden rounded-2xl border border-ink-700 bg-ink-900'

  if (tiles === 1) return `stage-frame ${base}`
  return `${base} h-full w-full min-h-0 min-w-0`
}

/**
 * Bandeau d'attente.
 *
 * Il est **hors de la grille** : compact, sur une seule ligne, il informe sans
 * jamais réserver une cellule vidéo ni dicter la hauteur de la scène.
 */
export const WAITING_BANNER_CLASS =
  'flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed border-ink-600 bg-ink-900/60 px-4 py-2.5'

/** Vignette compacte (bande sous un partage d'écran). */
export const COMPACT_TILE_CLASS =
  'relative aspect-video w-32 shrink-0 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 sm:w-40'

/**
 * Scène de présentation.
 *
 * Elle remplace entièrement la grille des caméras : le partage n'est plus une
 * cellule dimensionnée pour plusieurs webcams. La scène est une colonne dont
 * la surface d'image prend toute la hauteur restante.
 */
export const PRESENTATION_STAGE_CLASS =
  'presentation-stage flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-ink-950'

/**
 * Surface du partage d'écran.
 *
 * `size-full` + `min-h-0` : elle occupe réellement toute la place laissée par
 * la barre de présentation et les vignettes. En plein écran natif, le
 * navigateur l'affiche seule ; en repli CSS, `fixed inset-0` la porte au
 * viewport sans modifier la mise en page des autres participants.
 */
export function presentationSurfaceClass(fallback: boolean): string {
  return [
    'presentation-surface flex size-full min-h-0 min-w-0 items-center justify-center overflow-hidden bg-black',
    // Une seule position à la fois : `relative` et `fixed` se neutralisent
    // selon l'ordre des classes générées par Tailwind.
    fallback ? 'fixed inset-0 z-50' : 'relative',
  ].join(' ')
}

/**
 * Panneau latéral.
 *
 * Sur ordinateur sa largeur est **fixe** (22rem, `min-w` et `max-w` identiques)
 * et `shrink-0` : un message très long ne peut ni l'élargir, ni comprimer la
 * scène. Sa hauteur est bornée par la colonne (`max-h-full`), et c'est la zone
 * de contenu qui défile.
 */
export const SIDE_PANEL_CLASS = [
  'flex min-w-0 flex-col overflow-hidden border-ink-700 bg-ink-900',
  'fixed inset-x-0 bottom-0 z-30 max-h-[72dvh] rounded-t-2xl border-t',
  'lg:static lg:z-auto lg:max-h-full lg:w-[22rem] lg:min-w-[22rem] lg:max-w-[22rem]',
  'lg:shrink-0 lg:rounded-2xl lg:border',
].join(' ')
