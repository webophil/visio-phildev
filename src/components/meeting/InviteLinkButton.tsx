import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, Copy, Link2 } from 'lucide-react'

import { Button } from '../ui/Button'
import type { ButtonSize, ButtonVariant } from '../ui/Button'
import { copyTextToClipboard } from '../../lib/clipboard'
import { buildInvitationUrl } from '../../lib/format'
import { useMeeting } from '../../state/meetingContext'

type CopyState = 'idle' | 'copied' | 'error'

export interface InviteLinkButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

/**
 * Copie le lien d'invitation.
 * Le lien contient l'identifiant de la réunion Cloudflare (`?r=`) mais **aucun
 * jeton** : chaque participant reçoit le sien au moment où il rejoint.
 */
export function InviteLinkButton({
  variant = 'secondary',
  size = 'sm',
  className,
}: InviteLinkButtonProps) {
  const { meetingId, realtimeKitId } = useMeeting()
  const [state, setState] = useState<CopyState>('idle')
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  const invitationUrl = realtimeKitId ? buildInvitationUrl(meetingId, realtimeKitId) : null

  const handleCopy = useCallback(async () => {
    if (!invitationUrl) return

    const succeeded = await copyTextToClipboard(invitationUrl)
    setState(succeeded ? 'copied' : 'error')

    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setState('idle'), 2500)
  }, [invitationUrl])

  if (!invitationUrl) {
    return (
      <Button
        variant="secondary"
        size={size}
        className={className}
        disabled
        title="Lien indisponible : l'identifiant de réunion Cloudflare est absent."
      >
        <AlertTriangle aria-hidden="true" className="size-4 text-amber-300" />
        Lien incomplet
      </Button>
    )
  }

  const label =
    state === 'copied' ? 'Lien copié' : state === 'error' ? 'Copie impossible' : 'Copier le lien'

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => void handleCopy()}
      aria-live="polite"
      title={invitationUrl}
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
