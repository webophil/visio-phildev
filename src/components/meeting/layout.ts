/**
 * Règles de mise en page de la salle de réunion.
 *
 * Elles sont centralisées ici pour deux raisons :
 *
 * 1. la scène vidéo ne doit **jamais** dépendre de la hauteur du panneau
 *    latéral — un long message de chat ne peut pas agrandir les vignettes ;
 * 2. ces règles sont vérifiées par les tests de non-régression, qui refusent
 *    par exemple le retour d'une hauteur minimale fixe sur une vignette.
 */

/** Nombre de colonnes de la scène pour un nombre de vignettes donné. */
export function stageColumns(tiles: number): 1 | 2 | 3 {
  if (tiles <= 1) return 1
  if (tiles <= 4) return 2
  return 3
}

/**
 * Classes de la grille vidéo.
 *
 * `min-h-0` + `min-w-0` + `overflow-hidden` : la grille occupe la place que lui
 * laisse la colonne, et une vignette ne peut pas l'agrandir. `auto-rows-fr`
 * répartit la hauteur disponible en lignes égales, quel que soit le nombre de
 * participants (2 → une ligne, 3–4 → deux lignes, 5+ → trois colonnes).
 */
export function stageGridClass(tiles: number): string {
  const columns = stageColumns(tiles)

  return [
    'grid min-h-0 min-w-0 flex-1 auto-rows-fr gap-3 overflow-hidden',
    columns === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
    columns === 3 ? 'lg:grid-cols-3' : '',
  ]
    .filter((value) => value.length > 0)
    .join(' ')
}

/**
 * Vignette vidéo.
 *
 * Aucune hauteur minimale : la hauteur vient de la ligne de grille, jamais du
 * contenu. Le `<video>` en `object-cover` remplit la cellule sans déformation.
 */
export const VIDEO_TILE_CLASS =
  'relative min-h-0 min-w-0 overflow-hidden rounded-2xl border border-ink-700'

/** Vignette compacte (bande sous un partage d'écran). */
export const COMPACT_TILE_CLASS =
  'relative aspect-video w-40 shrink-0 overflow-hidden rounded-xl border border-ink-700'

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
