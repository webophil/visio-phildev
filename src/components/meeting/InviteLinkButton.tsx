import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'

import { Button } from '../ui/Button'
import type { ButtonSize, ButtonVariant } from '../ui/Button'
import { copyTextToClipboard } from '../../lib/clipboard'
import { buildMeetingUrl } from '../../lib/format'
import { useMeeting } from '../../state/meetingContext'

type CopyState = 'idle' | 'copied' | 'error'

export interface InviteLinkButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

export function InviteLinkButton({
  variant = 'secondary',
  size = 'sm',
  className,
}: InviteLinkButtonProps) {
  const { meetingId } = useMeeting()
  const [state, setState] = useState<CopyState>('idle')
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleCopy = useCallback(async () => {
    const succeeded = await copyTextToClipboard(buildMeetingUrl(meetingId))
    setState(succeeded ? 'copied' : 'error')

    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setState('idle'), 2500)
  }, [meetingId])

  const label =
    state === 'copied'
      ? 'Lien copié'
      : state === 'error'
        ? 'Copie impossible'
        : 'Copier le lien'

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => void handleCopy()}
      aria-live="polite"
      title={buildMeetingUrl(meetingId)}
    >
      {state === 'copied' ? (
        <Check aria-hidden="true" className="size-4 text-emerald-300" />
      ) : state === 'error' ? (
        <Link2 aria-hidden="true" className="size-4 text-rose-300" />
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
      {label}
    </Button>
  )
}
