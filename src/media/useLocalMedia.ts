import { useCallback, useEffect, useRef, useState } from 'react'

import {
  describeMediaError,
  deviceDisconnectedFailure,
  mediaDevicesSupported,
} from '../lib/mediaErrors'
import type { MediaFailure } from '../lib/mediaErrors'
import type { MediaAccessState, MediaDeviceList, MediaKind } from '../types/meeting'
import { useMediaDevices } from './useMediaDevices'

export interface RequestMediaOptions {
  audio: boolean
  video: boolean
}

export interface LocalMediaController {
  /** Flux local unique (pistes audio + vidéo), partagé avec le transport. */
  stream: MediaStream | null
  devices: MediaDeviceList
  devicesSupported: boolean
  audioState: MediaAccessState
  videoState: MediaAccessState
  failure: MediaFailure | null
  audioEnabled: boolean
  videoEnabled: boolean
  hasAudioTrack: boolean
  hasVideoTrack: boolean
  selectedAudioDeviceId: string | null
  selectedVideoDeviceId: string | null
  requestMedia: (options: RequestMediaOptions) => Promise<boolean>
  setAudioEnabled: (enabled: boolean) => Promise<void>
  setVideoEnabled: (enabled: boolean) => Promise<void>
  selectAudioDevice: (deviceId: string) => Promise<void>
  selectVideoDevice: (deviceId: string) => Promise<void>
  stopAll: () => void
  clearFailure: () => void
}

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
}

/**
 * Contrôleur du matériel local, basé sur les API MediaDevices natives.
 *
 * Principes :
 * - une seule acquisition `getUserMedia` par famille de périphérique, jamais
 *   dupliquée lors du passage de l'écran d'accueil à la réunion ;
 * - les pistes sont toujours arrêtées (`track.stop()`) : changement de
 *   périphérique, fin de réunion, démontage du composant ;
 * - aucune permission n'est simulée : chaque échec réel est traduit en français.
 */
export function useLocalMedia(): LocalMediaController {
  const { devices, supported: devicesSupported, refresh: refreshDevices } = useMediaDevices()

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [audioState, setAudioState] = useState<MediaAccessState>('idle')
  const [videoState, setVideoState] = useState<MediaAccessState>('idle')
  const [failure, setFailure] = useState<MediaFailure | null>(null)
  const [audioEnabled, setAudioEnabledState] = useState(true)
  const [videoEnabled, setVideoEnabledState] = useState(true)
  const [hasAudioTrack, setHasAudioTrack] = useState(false)
  const [hasVideoTrack, setHasVideoTrack] = useState(false)
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string | null>(null)
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const audioEnabledRef = useRef(true)
  const videoEnabledRef = useRef(true)
  const endedHandlers = useRef(new Map<MediaStreamTrack, () => void>())

  const publishStream = useCallback(() => {
    const current = streamRef.current
    setHasAudioTrack(Boolean(current && current.getAudioTracks().length > 0))
    setHasVideoTrack(Boolean(current && current.getVideoTracks().length > 0))
    setStream(current)
  }, [])

  const detachTrack = useCallback((track: MediaStreamTrack) => {
    const handler = endedHandlers.current.get(track)
    if (handler) {
      track.removeEventListener('ended', handler)
      endedHandlers.current.delete(track)
    }
  }, [])

  /** Surveille la coupure d'une piste (périphérique débranché ou désactivé). */
  const attachTrack = useCallback(
    (track: MediaStreamTrack, kind: MediaKind) => {
      const handler = () => {
        detachTrack(track)

        const current = streamRef.current
        if (current?.getTracks().includes(track)) current.removeTrack(track)

        if (kind === 'audio') {
          setAudioState('error')
        } else {
          setVideoState('error')
        }
        setFailure(deviceDisconnectedFailure(kind))
        publishStream()
      }

      endedHandlers.current.set(track, handler)
      track.addEventListener('ended', handler)
    },
    [detachTrack, publishStream],
  )

  /** Remplace la piste d'une famille de périphérique dans le flux courant. */
  const replaceTrack = useCallback(
    (kind: MediaKind, nextTrack: MediaStreamTrack) => {
      const current = streamRef.current ?? new MediaStream()
      const previous =
        kind === 'audio' ? current.getAudioTracks()[0] : current.getVideoTracks()[0]

      if (previous && previous !== nextTrack) {
        detachTrack(previous)
        previous.stop()
        current.removeTrack(previous)
      }

      nextTrack.enabled = kind === 'audio' ? audioEnabledRef.current : videoEnabledRef.current
      attachTrack(nextTrack, kind)
      current.addTrack(nextTrack)
      streamRef.current = current
    },
    [attachTrack, detachTrack],
  )

  const requestMedia = useCallback(
    async ({ audio, video }: RequestMediaOptions): Promise<boolean> => {
      if (!mediaDevicesSupported()) {
        const described = describeMediaError(null)
        setFailure(described)
        if (audio) setAudioState('error')
        if (video) setVideoState('error')
        return false
      }

      if (!audio && !video) return true

      setFailure(null)
      if (audio) setAudioState('requesting')
      if (video) setVideoState('requesting')

      try {
        const acquired = await navigator.mediaDevices.getUserMedia({
          audio: audio
            ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            : false,
          video: video ? VIDEO_CONSTRAINTS : false,
        })

        for (const track of acquired.getTracks()) {
          const kind: MediaKind = track.kind === 'audio' ? 'audio' : 'video'
          replaceTrack(kind, track)

          const deviceId = track.getSettings().deviceId ?? null
          if (kind === 'audio') {
            setAudioState('granted')
            if (deviceId) setSelectedAudioDeviceId(deviceId)
          } else {
            setVideoState('granted')
            if (deviceId) setSelectedVideoDeviceId(deviceId)
          }
        }

        publishStream()
        // Les libellés des périphériques deviennent lisibles après autorisation.
        await refreshDevices()
        return true
      } catch (error) {
        const described = describeMediaError(error)
        setFailure(described)
        const denied = described.reason === 'permission-denied'
        if (audio) setAudioState(denied ? 'denied' : 'error')
        if (video) setVideoState(denied ? 'denied' : 'error')
        publishStream()
        return false
      }
    },
    [publishStream, refreshDevices, replaceTrack],
  )

  const setAudioEnabled = useCallback(
    async (enabled: boolean) => {
      audioEnabledRef.current = enabled
      setAudioEnabledState(enabled)

      const track = streamRef.current?.getAudioTracks()[0]
      if (track) {
        track.enabled = enabled
        if (enabled) setAudioState('granted')
        return
      }

      if (enabled) await requestMedia({ audio: true, video: false })
    },
    [requestMedia],
  )

  const setVideoEnabled = useCallback(
    async (enabled: boolean) => {
      videoEnabledRef.current = enabled
      setVideoEnabledState(enabled)

      const track = streamRef.current?.getVideoTracks()[0]
      if (track) {
        track.enabled = enabled
        if (enabled) setVideoState('granted')
        return
      }

      if (enabled) await requestMedia({ audio: false, video: true })
    },
    [requestMedia],
  )

  const switchDevice = useCallback(
    async (kind: MediaKind, deviceId: string) => {
      if (!mediaDevicesSupported()) return

      setFailure(null)
      if (kind === 'audio') setAudioState('requesting')
      else setVideoState('requesting')

      try {
        const acquired = await navigator.mediaDevices.getUserMedia({
          audio: kind === 'audio' ? { deviceId: { exact: deviceId } } : false,
          video: kind === 'video' ? { ...VIDEO_CONSTRAINTS, deviceId: { exact: deviceId } } : false,
        })

        const nextTrack =
          kind === 'audio' ? acquired.getAudioTracks()[0] : acquired.getVideoTracks()[0]

        if (!nextTrack) {
          throw new DOMException('Piste indisponible', 'NotFoundError')
        }

        replaceTrack(kind, nextTrack)
        publishStream()

        if (kind === 'audio') {
          setAudioState('granted')
          setSelectedAudioDeviceId(deviceId)
        } else {
          setVideoState('granted')
          setSelectedVideoDeviceId(deviceId)
        }

        await refreshDevices()
      } catch (error) {
        const described = describeMediaError(error)
        setFailure(described)
        if (kind === 'audio') setAudioState('error')
        else setVideoState('error')
      }
    },
    [publishStream, refreshDevices, replaceTrack],
  )

  const selectAudioDevice = useCallback(
    (deviceId: string) => switchDevice('audio', deviceId),
    [switchDevice],
  )

  const selectVideoDevice = useCallback(
    (deviceId: string) => switchDevice('video', deviceId),
    [switchDevice],
  )

  const stopAll = useCallback(() => {
    const current = streamRef.current
    if (current) {
      for (const track of current.getTracks()) {
        detachTrack(track)
        track.stop()
        current.removeTrack(track)
      }
    }

    streamRef.current = null
    setStream(null)
    setHasAudioTrack(false)
    setHasVideoTrack(false)
    setAudioState('idle')
    setVideoState('idle')
    setSelectedAudioDeviceId(null)
    setSelectedVideoDeviceId(null)
  }, [detachTrack])

  const clearFailure = useCallback(() => setFailure(null), [])

  // Libération garantie du matériel lorsque la session est démontée.
  useEffect(() => {
    const handlers = endedHandlers.current
    return () => {
      const current = streamRef.current
      for (const track of current?.getTracks() ?? []) track.stop()
      streamRef.current = null
      handlers.clear()
    }
  }, [])

  return {
    stream,
    devices,
    devicesSupported,
    audioState,
    videoState,
    failure,
    audioEnabled,
    videoEnabled,
    hasAudioTrack,
    hasVideoTrack,
    selectedAudioDeviceId,
    selectedVideoDeviceId,
    requestMedia,
    setAudioEnabled,
    setVideoEnabled,
    selectAudioDevice,
    selectVideoDevice,
    stopAll,
    clearFailure,
  }
}
