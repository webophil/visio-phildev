import { useEffect, useState } from 'react'

/**
 * Temps écoulé depuis `startedAt` (en millisecondes), rafraîchi chaque seconde.
 *
 * La valeur est dérivée pendant le rendu à partir de l'horloge `now`, mise à
 * jour par un intervalle : aucun `setState` synchrone dans un effet, et
 * l'intervalle est systématiquement nettoyé (aucun minuteur résiduel après la
 * fin de la réunion).
 */
export function useDuration(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt === null) return

    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [startedAt])

  if (startedAt === null) return 0

  // `now` peut être antérieur au début de la réunion (horloge relevée au
  // montage) : la durée ne devient jamais négative.
  return Math.max(0, now - startedAt)
}