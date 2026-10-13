import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'

export interface VideoSurfaceProps {
  stream: MediaStream | null
  /** Faux lorsque la piste est absente ou désactivée : le flux est alors détaché. */
  active: boolean
  label: string
  mirrored?: boolean
  objectFit?: 'cover' | 'contain'
  className?: string
  /** Affiché à la place de la vidéo quand aucune image n'est disponible. */
  placeholder?: ReactNode
  /** Superposition (badge de nom, indicateurs). */
  children?: ReactNode
}

export function VideoSurface({
  stream,
  active,
  label,
  mirrored = false,
  objectFit = 'cover',
  className,
  placeholder,
  children,
}: VideoSurfaceProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const element = videoRef.current
    if (!element) return

    element.srcObject = active ? stream : null

    return () => {
      // Détache le flux : aucune référence conservée par l'élément vidéo.
      element.srcObject = null
    }
  }, [stream, active])

  return (
    <div className={cn('relative overflow-hidden bg-ink-950', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        aria-label={label}
        className={cn(
          'size-full',
          objectFit === 'cover' ? 'object-cover' : 'object-contain',
          mirrored ? '-scale-x-100' : '',
          active ? '' : 'invisible',
        )}
      />

      {!active && placeholder ? (
        <div className="absolute inset-0 grid place-items-center p-4 text-center">{placeholder}</div>
      ) : null}

      {children}
    </div>
  )
}

export interface VideoPlaceholderProps {
  title: string
  subtitle?: string
}

/** État vide honnête : aucune image, avec explication. */
export function VideoPlaceholder({ title, subtitle }: VideoPlaceholderProps) {
  return (
    <div className="flex max-w-xs flex-col items-center gap-2">
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-full border border-ink-600 bg-ink-850 text-base font-semibold text-accent-200"
      >
        {title.slice(0, 1).toUpperCase()}
      </span>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {subtitle ? <p className="text-xs leading-relaxed text-slate-400">{subtitle}</p> : null}
    </div>
  )
}
