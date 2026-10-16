import { useCallback } from 'react'

import { MeetingRoom } from './components/screens/MeetingRoom'
import { UnknownRouteScreen } from './components/screens/UnknownRouteScreen'
import { WelcomeScreen } from './components/screens/WelcomeScreen'
import { MEETING_LINK_PARAM } from './lib/ids'
import { meetingPath } from './lib/format'
import type { MeetingLink } from './lib/format'
import { navigate, useRoute } from './lib/router'
import { DEFAULT_DOCUMENT_TITLE, useDocumentTitle } from './lib/useDocumentTitle'

function App() {
  const route = useRoute()

  const goHome = useCallback(() => navigate('/'), [])

  // Le lien d'invitation porte l'identifiant de réunion Cloudflare (`?r=`) :
  // il est conservé tel quel dans la barre d'adresse, sans jamais contenir de
  // jeton de participation.
  const joinMeeting = useCallback((link: MeetingLink) => {
    const query = link.realtimeKitId
      ? `?${MEETING_LINK_PARAM}=${encodeURIComponent(link.realtimeKitId)}`
      : ''
    navigate(`${meetingPath(link.meetingId)}${query}`)
  }, [])

  return (
    <>
      {route.name === 'welcome' ? <WelcomeTitle /> : null}

      {route.name === 'welcome' ? <WelcomeScreen onJoinMeeting={joinMeeting} /> : null}

      {route.name === 'meeting' ? (
        <MeetingRoom meetingId={route.meetingId} realtimeKitId={route.realtimeKitId} />
      ) : null}

      {route.name === 'unknown' ? (
        <UnknownRouteScreen path={route.path} onGoHome={goHome} />
      ) : null}
    </>
  )
}

/** Rétablit le titre par défaut lorsque l'utilisateur est sur l'accueil. */
function WelcomeTitle() {
  useDocumentTitle(DEFAULT_DOCUMENT_TITLE)
  return null
}

export default App
