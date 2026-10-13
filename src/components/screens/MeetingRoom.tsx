import { useCallback } from 'react'

import { navigate } from '../../lib/router'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { MeetingProvider } from '../../state/MeetingProvider'
import { useMeeting } from '../../state/meetingContext'
import { MeetingScreen } from './MeetingScreen'
import { PreJoinScreen } from './PreJoinScreen'

function SessionRouter() {
  const { phase, meetingName, leaveMeeting } = useMeeting()

  useDocumentTitle(
    phase === 'in-meeting'
      ? `PhilDEV Visio — ${meetingName}`
      : `PhilDEV Visio — Rejoindre « ${meetingName} »`,
  )

  const handleBack = useCallback(() => {
    navigate('/')
  }, [])

  if (phase === 'in-meeting') return <MeetingScreen />

  return (
    <PreJoinScreen
      onBack={() => {
        // Quitte la salle et libère immédiatement le matériel local.
        void leaveMeeting().then(handleBack)
      }}
    />
  )
}

export interface MeetingRoomProps {
  meetingId: string
}

/** Une salle = un identifiant : le provider est remonté si l'identifiant change. */
export function MeetingRoom({ meetingId }: MeetingRoomProps) {
  return (
    <MeetingProvider key={meetingId} meetingId={meetingId}>
      <SessionRouter />
    </MeetingProvider>
  )
}