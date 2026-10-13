import { useCallback } from 'react'

import { MeetingRoom } from './components/screens/MeetingRoom'
import { UnknownRouteScreen } from './components/screens/UnknownRouteScreen'
import { WelcomeScreen } from './components/screens/WelcomeScreen'
import { createMeetingId } from './lib/ids'
import { meetingPath } from './lib/format'
import { navigate, useRoute } from './lib/router'
import { DEFAULT_DOCUMENT_TITLE, useDocumentTitle } from './lib/useDocumentTitle'

function App() {
  const route = useRoute()

  const goHome = useCallback(() => navigate('/'), [])
  const joinMeeting = useCallback((meetingId: string) => {
    navigate(meetingPath(meetingId))
  }, [])

  // Un identifiant local est généré puis utilisé dans l'URL du rendez-vous.
  const createMeeting = useCallback(() => {
    navigate(meetingPath(createMeetingId()))
  }, [])

  return (
    <>
      {route.name === 'welcome' ? <WelcomeTitle /> : null}

      {route.name === 'welcome' ? (
        <WelcomeScreen onCreateMeeting={createMeeting} onJoinMeeting={joinMeeting} />
      ) : null}

      {route.name === 'meeting' ? <MeetingRoom meetingId={route.meetingId} /> : null}

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