import { useEffect, useState } from 'react'

import { MEETING_LINK_PARAM, isValidMeetingId, isRealtimeKitId, MEETING_PATH_PREFIX } from './ids'

export type Route =
  | { name: 'welcome' }
  | { name: 'meeting'; meetingId: string; realtimeKitId: string | null }
  | { name: 'unknown'; path: string }

/**
 * Routage minimal basé sur l'historique du navigateur.
 * Deux routes seulement — accueil et salle de réunion (`/rdv-xxx`) — auxquelles
 * s'ajoute l'identifiant de réunion Cloudflare porté par le paramètre `?r=`.
 * Aucune dépendance externe n'est nécessaire.
 */
export function parsePath(pathname: string, search = ''): Route {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  if (path === '/' || path === '') return { name: 'welcome' }

  if (path.toLowerCase().startsWith(MEETING_PATH_PREFIX)) {
    const meetingId = path.slice(MEETING_PATH_PREFIX.length).toLowerCase()
    if (isValidMeetingId(meetingId)) {
      return { name: 'meeting', meetingId, realtimeKitId: readRealtimeKitId(search) }
    }
  }

  return { name: 'unknown', path: pathname }
}

/** Identifiant de réunion Cloudflare porté par le lien, s'il est valide. */
export function readRealtimeKitId(search: string): string | null {
  try {
    const value = new URLSearchParams(search).get(MEETING_LINK_PARAM)
    return isRealtimeKitId(value) ? value.trim() : null
  } catch {
    return null
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parsePath(window.location.pathname, window.location.search),
  )

  useEffect(() => {
    const handleChange = () => setRoute(parsePath(window.location.pathname, window.location.search))
    window.addEventListener('popstate', handleChange)
    return () => window.removeEventListener('popstate', handleChange)
  }, [])

  return route
}

export function navigate(to: string): void {
  // Comparaison sur le chemin **et** la requête : un lien d'invitation
  // (`?r=…`) vers la même route doit bien déclencher la navigation.
  if (to === `${window.location.pathname}${window.location.search}`) return

  window.history.pushState({}, '', to)
  // `useRoute` écoute `popstate` : on notifie immédiatement l'application.
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0 })
}
