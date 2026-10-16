import RealtimeKitClient from '@cloudflare/realtimekit'
import type { RTKSelfMedia } from '@cloudflare/realtimekit'
import { useCallback, useEffect, useRef, useState } from 'react'

import { describeMediaError, mediaDevicesSupported, mediaFailure } from '../lib/mediaErrors'
import type { MediaFailure } from '../lib/mediaErrors'
import type { MediaAccessState, MediaDeviceList, MediaDeviceOption, MediaKind } from '../types/meeting'
import { EMPTY_DEVICE_LIST } from '../types/meeting'

export interface RequestMediaOptions {
  audio: boolean
  video: boolean
}

export interface RtkMediaController {
  /** Flux local unique (pistes SDK), partagé avec le transport à l'entrée en réunion. */
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
  /**
   * Support média du SDK, transmis au transport à l'entrée en réunion.
   * Le réutiliser garantit **une seule capture** des périphériques.
   */
  getMediaHandler: () => RTKSelfMedia | null
}

interface MediaSnapshot {
  stream: MediaStream | null
  hasAudioTrack: boolean
  hasVideoTrack: boolean
  audioEnabled: boolean
  videoEnabled: boolean
}

const EMPTY_SNAPSHOT: MediaSnapshot = {
  stream: null,
  hasAudioTrack: false,
  hasVideoTrack: false,
  audioEnabled: false,
  videoEnabled: false,
}

function trackOf(media: RTKSelfMedia | null, kind: MediaKind): MediaStreamTrack | null {
  if (!media) return null
  try {
    const track = kind === 'audio' ? media.audioTrack : media.videoTrack
    return track ?? null
  } catch {
    // Les accesseurs du SDK lèvent tant que le média n'est pas initialisé.
    return null
  }
}

function enabledOf(media: RTKSelfMedia | null, kind: MediaKind): boolean {
  if (!media) return false
  try {
    return kind === 'audio' ? media.audioEnabled : media.videoEnabled
  } catch {
    return false
  }
}

function snapshotOf(media: RTKSelfMedia | null): MediaSnapshot {
  const audioTrack = trackOf(media, 'audio')
  const videoTrack = trackOf(media, 'video')
  const tracks = [audioTrack, videoTrack].filter((track): track is MediaStreamTrack => track !== null)

  return {
    stream: tracks.length > 0 ? new MediaStream(tracks) : null,
    hasAudioTrack: audioTrack !== null,
    hasVideoTrack: videoTrack !== null,
    audioEnabled: enabledOf(media, 'audio'),
    videoEnabled: enabledOf(media, 'video'),
  }
}

function toOptions(infos: MediaDeviceInfo[], fallbackLabel: string): MediaDeviceOption[] {
  return infos.map((info, index) => ({
    deviceId: info.deviceId,
    label: info.label.trim() || `${fallbackLabel} ${index + 1}`,
  }))
}

/**
 * État d'autorisation rapporté par le SDK pour une famille de périphérique.
 * Le SDK expose ces états sous forme de chaînes (`'ACCEPTED'`, `'DENIED'`…).
 */
function permissionState(media: RTKSelfMedia, kind: 'audio' | 'video'): MediaAccessState | null {
  try {
    switch (media.mediaPermissions?.[kind]) {
      case 'ACCEPTED':
        return 'granted'
      case 'DENIED':
      case 'SYSTEM_DENIED':
        return 'denied'
      case 'NOT_REQUESTED':
        return 'idle'
      default:
        return 'error'
    }
  } catch {
    return null
  }
}

/**
 * Contrôleur du matériel local, adossé au **SDK RealtimeKit**.
 *
 * Le SDK devient la source de vérité des périphériques : la capture est faite
 * une seule fois, à l'écran de préparation (`Client.initMedia`), et le support
 * obtenu est transmis tel quel au transport lors de l'entrée en réunion. Aucune
 * capture concurrente (`getUserMedia`) n'est ouverte à côté.
 */
export function useRtkMedia(): RtkMediaController {
  const [media, setMedia] = useState<RTKSelfMedia | null>(null)
  const [snapshot, setSnapshot] = useState<MediaSnapshot>(EMPTY_SNAPSHOT)
  const [devices, setDevices] = useState<MediaDeviceList>(EMPTY_DEVICE_LIST)
  const [audioState, setAudioState] = useState<MediaAccessState>('idle')
  const [videoState, setVideoState] = useState<MediaAccessState>('idle')
  const [failure, setFailure] = useState<MediaFailure | null>(null)
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string | null>(null)
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | null>(null)

  const mediaRef = useRef<RTKSelfMedia | null>(null)
  const devicesSupported = mediaDevicesSupported()

  const sync = useCallback((next: RTKSelfMedia | null) => {
    mediaRef.current = next
    setMedia(next)
    setSnapshot(snapshotOf(next))
  }, [])

  const refreshDevices = useCallback(async (current: RTKSelfMedia | null) => {
    if (!current) {
      setDevices(EMPTY_DEVICE_LIST)
      return
    }

    try {
      const [audioDevices, videoDevices] = await Promise.all([
        current.getAudioDevices(),
        current.getVideoDevices(),
      ])
      setDevices({
        audioInputs: toOptions(audioDevices ?? [], 'Microphone'),
        videoInputs: toOptions(videoDevices ?? [], 'Caméra'),
      })
    } catch {
      // L'énumération peut échouer avant l'initialisation : la liste précédente
      // est conservée plutôt que vidée.
    }
  }, [])

  const refreshCurrentDevices = useCallback((current: RTKSelfMedia | null) => {
    if (!current) return
    try {
      const currentDevices = current.getCurrentDevices()
      if (currentDevices?.audio?.deviceId) setSelectedAudioDeviceId(currentDevices.audio.deviceId)
      if (currentDevices?.video?.deviceId) setSelectedVideoDeviceId(currentDevices.video.deviceId)
    } catch {
      // Aucun périphérique actif : les sélections restent inchangées.
    }
  }, [])

  const requestMedia = useCallback(
    async ({ audio, video }: RequestMediaOptions): Promise<boolean> => {
      if (!mediaDevicesSupported()) {
        setFailure(describeMediaError(null))
        if (audio) setAudioState('error')
        if (video) setVideoState('error')
        return false
      }

      if (!audio && !video) return true

      setFailure(null)
      if (audio) setAudioState('requesting')
      if (video) setVideoState('requesting')

      try {
        const acquired = await RealtimeKitClient.initMedia({ audio, video })
        sync(acquired)

        if (audio) {
          setAudioState(permissionState(acquired, 'audio') ?? (trackOf(acquired, 'audio') ? 'granted' : 'error'))
        }
        if (video) {
          setVideoState(permissionState(acquired, 'video') ?? (trackOf(acquired, 'video') ? 'granted' : 'error'))
        }

        const missingKinds: MediaKind[] = []
        if (audio && !trackOf(acquired, 'audio')) missingKinds.push('audio')
        if (video && !trackOf(acquired, 'video')) missingKinds.push('video')
        if (missingKinds.length > 0) setFailure(mediaFailure('no-device'))

        await refreshDevices(acquired)
        refreshCurrentDevices(acquired)
        return missingKinds.length === 0
      } catch (error) {
        const described = describeMediaError(error)
        setFailure(described)
        const denied = described.reason === 'permission-denied'
        if (audio) setAudioState(denied ? 'denied' : 'error')
        if (video) setVideoState(denied ? 'denied' : 'error')
        if (!mediaRef.current) sync(null)
        return false
      }
    },
    [refreshCurrentDevices, refreshDevices, sync],
  )

  const setAudioEnabled = useCallback(
    async (enabled: boolean) => {
      const current = mediaRef.current
      if (!current) {
        if (enabled) await requestMedia({ audio: true, video: false })
        return
      }

      try {
        if (enabled) {
          await current.enableAudio()
          setAudioState('granted')
        } else {
          await current.disableAudio()
        }
      } catch (error) {
        setFailure(describeMediaError(error))
        setAudioState('error')
      }
      sync(current)
    },
    [requestMedia, sync],
  )

  const setVideoEnabled = useCallback(
    async (enabled: boolean) => {
      const current = mediaRef.current
      if (!current) {
        if (enabled) await requestMedia({ audio: false, video: true })
        return
      }

      try {
        if (enabled) {
          await current.enableVideo()
          setVideoState('granted')
        } else {
          await current.disableVideo()
        }
      } catch (error) {
        setFailure(describeMediaError(error))
        setVideoState('error')
      }
      sync(current)
    },
    [requestMedia, sync],
  )

  const switchDevice = useCallback(
    async (kind: MediaKind, deviceId: string) => {
      const current = mediaRef.current
      if (!current) return

      setFailure(null)
      try {
        const device = await current.getDeviceById(deviceId, kind)
        await current.setDevice(device)
        if (kind === 'audio') setSelectedAudioDeviceId(deviceId)
        else setSelectedVideoDeviceId(deviceId)
        sync(current)
        await refreshDevices(current)
      } catch (error) {
        setFailure(describeMediaError(error))
        if (kind === 'audio') setAudioState('error')
        else setVideoState('error')
      }
    },
    [refreshDevices, sync],
  )

  const stopAll = useCallback(() => {
    const current = mediaRef.current
    if (current) {
      trackOf(current, 'audio')?.stop()
      trackOf(current, 'video')?.stop()
    }

    mediaRef.current = null
    setMedia(null)
    setSnapshot(EMPTY_SNAPSHOT)
    setDevices(EMPTY_DEVICE_LIST)
    setAudioState('idle')
    setVideoState('idle')
    setSelectedAudioDeviceId(null)
    setSelectedVideoDeviceId(null)
  }, [])

  const clearFailure = useCallback(() => setFailure(null), [])

  const getMediaHandler = useCallback(() => mediaRef.current, [])

  // Le SDK signale les changements de piste ou de périphérique : l'aperçu et la
  // liste des périphériques suivent ces événements plutôt que de les deviner.
  useEffect(() => {
    if (!media) return

    const handleChange = () => {
      setSnapshot(snapshotOf(media))
      void refreshDevices(media)
      refreshCurrentDevices(media)
    }

    media.on('videoUpdate', handleChange)
    media.on('audioUpdate', handleChange)
    media.on('deviceUpdate', handleChange)
    media.on('deviceListUpdate', handleChange)

    return () => {
      media.removeListener('videoUpdate', handleChange)
      media.removeListener('audioUpdate', handleChange)
      media.removeListener('deviceUpdate', handleChange)
      media.removeListener('deviceListUpdate', handleChange)
    }
  }, [media, refreshCurrentDevices, refreshDevices])

  // Libération garantie du matériel lorsque la session est démontée.
  useEffect(() => {
    return () => {
      const current = mediaRef.current
      if (!current) return
      try {
        current.audioTrack?.stop()
        current.videoTrack?.stop()
      } catch {
        // Les pistes peuvent déjà être arrêtées par le SDK.
      }
      mediaRef.current = null
    }
  }, [])

  return {
    stream: snapshot.stream,
    devices,
    devicesSupported,
    audioState,
    videoState,
    failure,
    audioEnabled: snapshot.audioEnabled,
    videoEnabled: snapshot.videoEnabled,
    hasAudioTrack: snapshot.hasAudioTrack,
    hasVideoTrack: snapshot.hasVideoTrack,
    selectedAudioDeviceId,
    selectedVideoDeviceId,
    requestMedia,
    setAudioEnabled,
    setVideoEnabled,
    selectAudioDevice: useCallback((deviceId: string) => switchDevice('audio', deviceId), [switchDevice]),
    selectVideoDevice: useCallback((deviceId: string) => switchDevice('video', deviceId), [switchDevice]),
    stopAll,
    clearFailure,
    getMediaHandler,
  }
}
