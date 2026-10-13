import { createContext, useContext } from 'react'

import type { LocalMediaController } from '../media/useLocalMedia'
import type { ScreenShareController } from '../media/useScreenShare'
import type { LocalParticipant, SessionPhase, SidePanelId, TransportState } from '../types/meeting'

export interface MeetingContextValue {
  meetingId: string
  meetingName: string
  phase: SessionPhase
  durationMs: number
  /** Participant local réel — Phase 1 ne connaît aucun participant distant. */
  localParticipant: LocalParticipant
  participantName: string
  setParticipantName: (name: string) => void
  activePanel: SidePanelId | null
  togglePanel: (panel: SidePanelId) => void
  closePanel: () => void
  joinMeeting: () => Promise<void>
  leaveMeeting: () => Promise<void>
  media: LocalMediaController
  screenShare: ScreenShareController
  transport: TransportState
  screenSharingActive: boolean
}

export const MeetingContext = createContext<MeetingContextValue | null>(null)

export function useMeeting(): MeetingContextValue {
  const context = useContext(MeetingContext)

  if (!context) {
    throw new Error("useMeeting doit être utilisé à l'intérieur d'un MeetingProvider")
  }

  return context
}
