import type { RTKParticipant, RTKSelf } from '@cloudflare/realtimekit'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'

/**
 * Surfaces vidéo issues du SDK RealtimeKit.
 *
 * Le SDK rattache lui-même les pistes aux éléments `<video>` : la vidéo
 * distante via `participant.registerVideoElement`, l'aperçu local via
 * `self.registerVideoElement(element, true)`. Le détachement est systématique
 * au démontage, afin qu'aucune référence de flux ne survive à la réunion.
 *
 * Le partage d'écran, lui, n'est pas exposé par le SDK sous forme d'élément
 * enregistré : ses pistes sont rattachées explicitement à un `<video>`.
 */

export interface RtkParticipantVideoProps {
  participant: RTKParticipant
  enabled: boolean
  label: string
  className?: string
  placeholder: ReactNode
  children?: ReactNode
}

/** Vidéo d'un participant distant, rattachée par le SDK. */
export function RtkParticipantVideo({
  participant,
  enabled,
  label,
  className,
  placeholder,
  children,
}: RtkParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const element = videoRef.current
    if (!element) return

    participant.registerVideoElement(element)
    return () => {
      // Le SDK renvoie l'objet participant : la fonction de nettoyage ne doit
      // rien retourner, sinon React l'interprète comme un destructeur invalide.
      participant.deregisterVideoElement(element)
    }
  }, [participant])

  return (
    <VideoShell
      videoRef={videoRef}
      enabled={enabled}
      label={label}
      className={className}
      placeholder={placeholder}
    >
      {children}
    </VideoShell>
  )
}

export interface RtkSelfVideoProps {
  self: RTKSelf
  enabled: boolean
  label: string
  mirrored?: boolean
  className?: string
  placeholder: ReactNode
  children?: ReactNode
}

/** Aperçu local en réunion, rattaché au SDK en mode aperçu. */
export function RtkSelfVideo({
  self,
  enabled,
  label,
  mirrored = true,
  className,
  placeholder,
  children,
}: RtkSelfVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const element = videoRef.current
    if (!element) return

    self.registerVideoElement(element, true)
    return () => {
      self.deregisterVideoElement(element, true)
    }
  }, [self])

  return (
    <VideoShell
      videoRef={videoRef}
      enabled={enabled}
      label={label}
      mirrored={mirrored}
      className={className}
      placeholder={placeholder}
    >
      {children}
    </VideoShell>
  )
}

interface VideoShellProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  enabled: boolean
  label: string
  mirrored?: boolean
  className?: string
  placeholder: ReactNode
  children?: ReactNode
}

function VideoShell({
  videoRef,
  enabled,
  label,
  mirrored = false,
  className,
  placeholder,
  children,
}: VideoShellProps) {
  return (
    <div className={cn('relative overflow-hidden bg-ink-950', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        aria-label={label}
        className={cn(
          'size-full object-cover',
          mirrored ? '-scale-x-100' : '',
          enabled ? '' : 'invisible',
        )}
      />
      {!enabled ? (
        <div className="absolute inset-0 grid place-items-center p-4 text-center">{placeholder}</div>
      ) : null}
      {children}
    </div>
  )
}

export interface ScreenShareViewProps {
  participant: RTKParticipant
  label: string
  className?: string
  placeholder: ReactNode
}

/** Partage d'écran d'un participant distant (pistes rattachées explicitement). */
export function RemoteScreenShare({ participant, label, className, placeholder }: ScreenShareViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const handleUpdate = () => setRevision((current) => current + 1)
    participant.on('screenShareUpdate', handleUpdate)
    return () => {
      participant.removeListener('screenShareUpdate', handleUpdate)
    }
  }, [participant])

  useEffect(() => {
    const element = videoRef.current
    if (!element) return

    const tracks = participant.screenShareTracks
    const stream = tracks?.video ? new MediaStream([tracks.video]) : null
    element.srcObject = stream

    return () => {
      element.srcObject = null
    }
  }, [participant, revision])

  return (
    <ScreenShareBox videoRef={videoRef} label={label} className={className} placeholder={placeholder} />
  )
}

export interface SelfScreenShareViewProps {
  self: RTKSelf
  label: string
  className?: string
  placeholder: ReactNode
}

/** Partage d'écran local : même source que celle publiée aux participants. */
export function SelfScreenShareView({ self, label, className, placeholder }: SelfScreenShareViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const handleUpdate = () => setRevision((current) => current + 1)
    self.on('screenShareUpdate', handleUpdate)
    return () => {
      self.removeListener('screenShareUpdate', handleUpdate)
    }
  }, [self])

  useEffect(() => {
    const element = videoRef.current
    if (!element) return

    const tracks = self.screenShareTracks
    const stream = tracks?.video ? new MediaStream([tracks.video]) : null
    element.srcObject = stream

    return () => {
      element.srcObject = null
    }
  }, [self, revision])

  return (
    <ScreenShareBox videoRef={videoRef} label={label} className={className} placeholder={placeholder} />
  )
}

interface ScreenShareBoxProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  label: string
  className?: string
  placeholder: ReactNode
}

function ScreenShareBox({ videoRef, label, className, placeholder }: ScreenShareBoxProps) {
  const [hasImage, setHasImage] = useState(false)

  useEffect(() => {
    const element = videoRef.current
    if (!element) return

    const handleLoaded = () => setHasImage(true)
    const handleEmptied = () => setHasImage(false)

    element.addEventListener('loadeddata', handleLoaded)
    element.addEventListener('emptied', handleEmptied)
    if (element.srcObject) setHasImage(true)

    return () => {
      element.removeEventListener('loadeddata', handleLoaded)
      element.removeEventListener('emptied', handleEmptied)
    }
  }, [videoRef])

  return (
    <div className={cn('relative overflow-hidden bg-ink-950', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        aria-label={label}
        className={cn('size-full object-contain', hasImage ? '' : 'invisible')}
      />
      {!hasImage ? (
        <div className="absolute inset-0 grid place-items-center p-4 text-center">{placeholder}</div>
      ) : null}
    </div>
  )
}
