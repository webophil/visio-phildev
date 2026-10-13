import { useCallback, useEffect, useRef, useState } from 'react'

import { describeDisplayError, displayCaptureSupported } from '../lib/mediaErrors'
import type { MediaFailure } from '../lib/mediaErrors'

export type ScreenShareStatus = 'idle' | 'requesting' | 'active' | 'error'

export interface ScreenShareController {
  supported: boolean
  stream: MediaStream | null
  status: ScreenShareStatus
  failure: MediaFailure | null
  start: () => Promise<void>
  stop: () => void
  clearFailure: () => void
}

/**
 * Partage d'écran natif (`getDisplayMedia`).
 * Le navigateur conserve la main sur le choix de la source (écran, fenêtre ou
 * onglet) et sur son propre bouton « Arrêter le partage » : la piste `ended`
 * est écoutée pour remettre l'interface dans un état cohérent.
 */
export function useScreenShare(): ScreenShareController {
  const supported = displayCaptureSupported()
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<ScreenShareStatus>('idle')
  const [failure, setFailure] = useState<MediaFailure | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const endedHandlerRef = useRef<(() => void) | null>(null)

  const releaseStream = useCallback(() => {
    const current = streamRef.current
    if (current) {
      for (const track of current.getTracks()) {
        if (endedHandlerRef.current) track.removeEventListener('ended', endedHandlerRef.current)
        track.stop()
      }
    }
    streamRef.current = null
    endedHandlerRef.current = null
    setStream(null)
  }, [])

  const stop = useCallback(() => {
    releaseStream()
    setStatus('idle')
  }, [releaseStream])

  const start = useCallback(async () => {
    if (!displayCaptureSupported()) {
      setFailure(describeDisplayError(null))
      setStatus('error')
      return
    }

    setFailure(null)
    setStatus('requesting')

    try {
      const captured = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15 } },
        audio: false,
      })

      const track = captured.getVideoTracks()[0]
      if (!track) {
        for (const pending of captured.getTracks()) pending.stop()
        throw new DOMException('Piste vidéo indisponible', 'NotFoundError')
      }

      const handleEnded = () => {
        // L'utilisateur a arrêté le partage depuis le bandeau du navigateur.
        releaseStream()
        setStatus('idle')
      }

      track.addEventListener('ended', handleEnded)
      endedHandlerRef.current = handleEnded

      streamRef.current = captured
      setStream(captured)
      setStatus('active')
    } catch (error) {
      setFailure(describeDisplayError(error))
      setStatus('error')
      releaseStream()
    }
  }, [releaseStream])

  const clearFailure = useCallback(() => setFailure(null), [])

  useEffect(() => {
    return () => {
      releaseStream()
    }
  }, [releaseStream])

  return { supported, stream, status, failure, start, stop, clearFailure }
}
