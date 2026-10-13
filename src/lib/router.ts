import { useEffect, useState } from 'react'

import { isValidMeetingId, MEETING_PATH_PREFIX } from './ids'

export type Route =
  | { name: 'welcome' }
  | { name: 'meeting'; meetingId: string }
  | { name: 'unknown'; path: string }

/**
 * Routage minimal basé sur l'historique du navigateur.
 * Phase 1 : deux routes seulement — accueil et salle de réunion (`/rdv-xxx`).
 * Aucune dépendance externe n'est nécessaire.
 */
export function parsePath(pathname: string): Route {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  if (path === '/' || path === '') return { name: 'welcome' }

  if (path.toLowerCase().startsWith(MEETING_PATH_PREFIX)) {
    const meetingId = path.slice(MEETING_PATH_PREFIX.length).toLowerCase()
    if (isValidMeetingId(meetingId)) return { name: 'meeting', meetingId }
  }

  return { name: 'unknown', path: pathname }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parsePath(window.location.pathname))

  useEffect(() => {
    const handleChange = () => setRoute(parsePath(window.location.pathname))
    window.addEventListener('popstate', handleChange)
    return () => window.removeEventListener('popstate', handleChange)
  }, [])

  return route
}

export function navigate(to: string): void {
  if (to === window.location.pathname) return

  window.history.pushState({}, '', to)
  // `useRoute` écoute `popstate` : on notifie immédiatement l'application.
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0 })
}
