import type RTKClient from '@cloudflare/realtimekit'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { meetingDisplayName } from '../lib/ids'
import { useDuration } from '../lib/useDuration'
import { useRtkMedia } from '../media/useRtkMedia'
import { readHostSession } from '../meeting/hostSession'
import { describeSessionError } from '../meeting/rtkErrors'
import { createTransport } from '../meeting/transport'
import type { MeetingTransport } from '../meeting/transport'
import { emptySessionState } from '../types/meeting'
import type { MeetingSessionState, SessionError, SessionPhase, SidePanelId, TransportState } from '../types/meeting'
import { MeetingContext } from './meetingContext'
import type { MeetingContextValue } from './meetingContext'

const PARTICIPANT_NAME_KEY = 'phildev-visio:participant-name'

/** Intention audio/vidéo conservée entre deux entrées dans la même salle. */
interface MediaIntent {
  audio: boolean
  video: boolean
}

function readStoredParticipantName(): string {
  try {
    return window.localStorage.getItem(PARTICIPANT_NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export interface MeetingProviderProps {
  meetingId: string
  realtimeKitId: string | null
  children: ReactNode
}

/**
 * Session de réunion : point d'entrée unique pour l'état (`phase`, panneaux,
 * durée), le matériel local et la session temps réel.
 *
 * Aucun composant ne parle directement au SDK : le transport
 * (`src/meeting/transport`) est la seule frontière, et il expose un instantané
 * de la session que l'interface consomme tel quel.
 */
export function MeetingProvider({ meetingId, realtimeKitId, children }: MeetingProviderProps) {
  const media = useRtkMedia()

  const [phase, setPhase] = useState<SessionPhase>('prejoin')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<SessionError | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [activePanel, setActivePanel] = useState<SidePanelId | null>(null)
  const [participantName, setParticipantNameState] = useState(readStoredParticipantName)
  const [mediaIntent, setMediaIntent] = useState<MediaIntent>({ audio: true, video: true })
  const [transport, setTransport] = useState<MeetingTransport | null>(null)
  const [client, setClient] = useState<RTKClient | null>(null)
  const [transportState, setTransportState] = useState<TransportState>({
    mode: 'realtimekit',
    supportsRemoteParticipants: realtimeKitId !== null,
    connection: realtimeKitId ? 'disconnected' : 'local',
  })
  const [session, setSession] = useState<MeetingSessionState>(() => emptySessionState(5))

  const participantNameRef = useRef(participantName)
  const hostSession = useMemo(() => readHostSession(), [])
  const isHost = hostSession !== null

  const durationMs = useDuration(startedAt)
  const meetingName = meetingDisplayName(meetingId)

  // Le transport reste la source de l'état de connexion et de la session : il
  // est créé avec son état initial (voir `joinMeeting`), puis observé ici.
  useEffect(() => {
    if (!transport) return

    const unsubscribeState = transport.subscribe(setTransportState)
    const unsubscribeSession = transport.subscribeSession(setSession)

    return () => {
      unsubscribeState()
      unsubscribeSession()
    }
  }, [transport])

  const setParticipantName = useCallback((name: string) => {
    participantNameRef.current = name
    setParticipantNameState(name)
    try {
      window.localStorage.setItem(PARTICIPANT_NAME_KEY, name)
    } catch {
      // Stockage indisponible (navigation privée) : le nom reste en mémoire.
    }
  }, [])

  const toggleAudio = useCallback(
    async (enabled: boolean) => {
      setMediaIntent((current) => ({ ...current, audio: enabled }))
      await media.setAudioEnabled(enabled)
    },
    [media],
  )

  const toggleVideo = useCallback(
    async (enabled: boolean) => {
      setMediaIntent((current) => ({ ...current, video: enabled }))
      await media.setVideoEnabled(enabled)
    },
    [media],
  )

  const joinMeeting = useCallback(async () => {
    setJoinError(null)
    setJoining(true)

    try {
      // Le support média acquis à l'écran de préparation est réutilisé : le SDK
      // n'ouvre pas une seconde capture des périphériques.
      let handler = media.getMediaHandler()
      if (!handler && (mediaIntent.audio || mediaIntent.video)) {
        await media.requestMedia(mediaIntent)
        handler = media.getMediaHandler()
      }

      const nextTransport = createTransport({
        meetingId,
        realtimeKitId,
        displayName: participantNameRef.current.trim() || 'Participant',
        role: hostSession ? 'host' : 'guest',
        hostToken: hostSession?.token ?? null,
        mediaHandler: handler,
      })

      await nextTransport.join()

      setTransport(nextTransport)
      setClient(nextTransport.getClient())
      setSession(nextTransport.getSession())
      setTransportState(nextTransport.getState())
      setStartedAt(Date.now())
      setPhase('in-meeting')
    } catch (error) {
      setJoinError(describeSessionError(error))
    } finally {
      setJoining(false)
    }
  }, [hostSession, media, mediaIntent, meetingId, realtimeKitId])

  const leaveMeeting = useCallback(async () => {
    if (transport) await transport.leave()
    media.stopAll()

    setTransport(null)
    setClient(null)
    setSession(emptySessionState(session.maxParticipants))
    setTransportState({
      mode: 'realtimekit',
      supportsRemoteParticipants: realtimeKitId !== null,
      connection: realtimeKitId ? 'disconnected' : 'local',
    })
    setStartedAt(null)
    setActivePanel(null)
    setPhase('prejoin')
  }, [media, realtimeKitId, session.maxParticipants, transport])

  const togglePanel = useCallback((panel: SidePanelId) => {
    setActivePanel((current) => (current === panel ? null : panel))
  }, [])

  const closePanel = useCallback(() => setActivePanel(null), [])
  const clearError = useCallback(() => setJoinError(null), [])
  const clearSessionError = useCallback(() => transport?.clearError(), [transport])

  const setMicrophoneEnabled = useCallback(
    async (enabled: boolean) => {
      setMediaIntent((current) => ({ ...current, audio: enabled }))
      await transport?.setMicrophoneEnabled(enabled)
    },
    [transport],
  )

  const setCameraEnabled = useCallback(
    async (enabled: boolean) => {
      setMediaIntent((current) => ({ ...current, video: enabled }))
      await transport?.setCameraEnabled(enabled)
    },
    [transport],
  )

  const setScreenShareEnabled = useCallback(
    async (enabled: boolean) => {
      await transport?.setScreenShareEnabled(enabled)
    },
    [transport],
  )

  const value: MeetingContextValue = {
    meetingId,
    meetingName,
    realtimeKitId,
    phase,
    joining,
    durationMs,
    joinError,
    clearJoinError: clearError,
    participantName,
    setParticipantName,
    activePanel,
    togglePanel,
    closePanel,
    joinMeeting,
    leaveMeeting,
    media,
    toggleAudio,
    toggleVideo,
    transport: transportState,
    session,
    isHost,
    setMicrophoneEnabled,
    setCameraEnabled,
    setScreenShareEnabled,
    clearSessionError,
    client,
  }

  return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>
}
