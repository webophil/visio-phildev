import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { meetingDisplayName } from '../lib/ids'
import { useDuration } from '../lib/useDuration'
import { useLocalMedia } from '../media/useLocalMedia'
import { useScreenShare } from '../media/useScreenShare'
import { createTransport } from '../meeting/transport'
import type { MeetingTransport } from '../meeting/transport'
import type { LocalParticipant, SessionPhase, SidePanelId, TransportState } from '../types/meeting'
import { MeetingContext } from './meetingContext'
import type { MeetingContextValue } from './meetingContext'

const PARTICIPANT_NAME_KEY = 'phildev-visio:participant-name'

function readStoredParticipantName(): string {
  try {
    return window.localStorage.getItem(PARTICIPANT_NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export interface MeetingProviderProps {
  meetingId: string
  children: ReactNode
}

/**
 * Session de réunion : point d'entrée unique pour l'état (`phase`, panneaux,
 * durée), le matériel local, le partage d'écran et le transport temps réel.
 * Aucun composant ne parle directement à un SDK : seul le transport est
 * remplaçable (voir `src/meeting/transport`).
 */
export function MeetingProvider({ meetingId, children }: MeetingProviderProps) {
  const media = useLocalMedia()
  const screenShare = useScreenShare()

  const [phase, setPhase] = useState<SessionPhase>('prejoin')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [activePanel, setActivePanel] = useState<SidePanelId | null>(null)
  const [mediaRequested, setMediaRequested] = useState(false)
  const [participantName, setParticipantNameState] = useState(readStoredParticipantName)
  const [transportState, setTransportState] = useState<TransportState>({
    mode: 'local-only',
    supportsRemoteParticipants: false,
    connection: 'local',
  })

  const participantNameRef = useRef(participantName)
  const transportRef = useRef<MeetingTransport | null>(null)

  const durationMs = useDuration(startedAt)
  const meetingName = meetingDisplayName(meetingId)

  const getTransport = useCallback((): MeetingTransport => {
    if (!transportRef.current) {
      transportRef.current = createTransport({
        meetingId,
        displayName: participantNameRef.current || 'Participant',
      })
    }
    return transportRef.current
  }, [meetingId])

  useEffect(() => {
    const transport = getTransport()
    setTransportState(transport.getState())
    return transport.subscribe(setTransportState)
  }, [getTransport])

  // Le transport reste informé des flux locaux (publiés vers nulle part en Phase 1).
  useEffect(() => {
    void getTransport().publishLocalMedia(media.stream)
  }, [getTransport, media.stream])

  useEffect(() => {
    void getTransport().publishScreenShare(screenShare.stream)
  }, [getTransport, screenShare.stream])

  const setParticipantName = useCallback((name: string) => {
    participantNameRef.current = name
    setParticipantNameState(name)
    try {
      window.localStorage.setItem(PARTICIPANT_NAME_KEY, name)
    } catch {
      // Stockage indisponible (navigation privée) : le nom reste en mémoire.
    }
  }, [])

  const joinMeeting = useCallback(async () => {
    if (!mediaRequested) {
      setMediaRequested(true)
      // Une seule demande d'accès réel : aucune permission n'est simulée.
      await media.requestMedia({ audio: media.audioEnabled, video: media.videoEnabled })
    }

    await getTransport().join()
    setStartedAt(Date.now())
    setPhase('in-meeting')
  }, [getTransport, media, mediaRequested])

  const leaveMeeting = useCallback(async () => {
    screenShare.stop()
    media.stopAll()
    await getTransport().leave()
    setStartedAt(null)
    setActivePanel(null)
    setPhase('prejoin')
  }, [getTransport, media, screenShare])

  const togglePanel = useCallback((panel: SidePanelId) => {
    setActivePanel((current) => (current === panel ? null : panel))
  }, [])

  const closePanel = useCallback(() => setActivePanel(null), [])

  const localParticipant: LocalParticipant = {
    displayName: participantName || 'Vous',
    audioEnabled: media.audioEnabled && media.hasAudioTrack,
    videoEnabled: media.videoEnabled && media.hasVideoTrack,
    screenSharing: screenShare.status === 'active',
  }

  const value: MeetingContextValue = {
    meetingId,
    meetingName,
    phase,
    durationMs,
    localParticipant,
    participantName,
    setParticipantName,
    activePanel,
    togglePanel,
    closePanel,
    joinMeeting,
    leaveMeeting,
    media,
    screenShare,
    transport: transportState,
    screenSharingActive: screenShare.status === 'active',
  }

  return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>
}
