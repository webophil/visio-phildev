import { useCallback, useEffect, useState } from 'react'

export type PresentationFullscreenMode = 'inline' | 'native' | 'fallback'

export interface PresentationFullscreen {
  /** `native` : Fullscreen API ; `fallback` : surface fixe couvrant le viewport. */
  mode: PresentationFullscreenMode
  expanded: boolean
  /** Explication affichée si le navigateur refuse le plein écran natif. */
  error: string | null
  toggle: () => Promise<void>
  exit: () => Promise<void>
}

/**
 * Plein écran **local** de la zone de présentation.
 *
 * Le choix d'un participant ne touche ni le transport, ni l'état partagé de la
 * réunion : seul cet élément est agrandi. Si l'API Fullscreen est absente ou
 * refusée (iPhone, iframe restrictive, politique du navigateur), la même
 * surface passe en mode agrandi CSS, qui couvre le viewport sans dépendre
 * d'une permission supplémentaire.
 *
 * `surface` provient d'une ref de rappel stockée dans l'état du composant :
 * les actions dépendent d'une valeur, jamais d'une lecture de `ref.current`
 * pendant le rendu.
 */
export function usePresentationFullscreen(
  surface: HTMLElement | null,
): PresentationFullscreen {
  const [native, setNative] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!surface) return

    const sync = () => setNative(document.fullscreenElement === surface)
    document.addEventListener('fullscreenchange', sync)
    sync()

    return () => {
      document.removeEventListener('fullscreenchange', sync)
      // Quitter le partage pendant le plein écran ne doit pas laisser le
      // navigateur bloqué sur un élément démonté.
      if (document.fullscreenElement === surface) {
        void document.exitFullscreen().catch(() => undefined)
      }
    }
  }, [surface])

  const exit = useCallback(async () => {
    setFallback(false)
    setError(null)

    if (surface && document.fullscreenElement === surface) {
      try {
        await document.exitFullscreen()
      } catch {
        // Le navigateur a déjà quitté le plein écran : aucun état à corriger.
      }
    }
  }, [surface])

  // Échap fonctionne nativement dans la plupart des navigateurs, mais le repli
  // CSS en a besoin et certains environnements n'interceptent pas la touche.
  // Un seul chemin de sortie garantit alors le retour au mode intégré.
  useEffect(() => {
    if (!native && !fallback) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      void exit()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [exit, fallback, native])

  const toggle = useCallback(async () => {
    if (native || fallback) {
      await exit()
      return
    }

    if (!surface) return

    setError(null)

    if (document.fullscreenEnabled === false || typeof surface.requestFullscreen !== 'function') {
      setFallback(true)
      return
    }

    try {
      await surface.requestFullscreen({ navigationUI: 'hide' })
    } catch {
      // Refus ou restriction (iframe, geste utilisateur, politique du
      // navigateur) : le mode agrandi reste disponible et ne bloque rien.
      setFallback(true)
      setError(
        'Le plein écran natif a été refusé par le navigateur. Le partage est affiché en mode agrandi.',
      )
    }
  }, [exit, fallback, native, surface])

  return {
    mode: native ? 'native' : fallback ? 'fallback' : 'inline',
    expanded: native || fallback,
    error,
    toggle,
    exit,
  }
}
