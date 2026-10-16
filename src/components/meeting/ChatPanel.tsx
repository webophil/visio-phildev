import { Info, MessageSquare, Send } from 'lucide-react'

import { Button } from '../ui/Button'
import { Notice } from '../ui/Notice'
import { SidePanel } from '../ui/SidePanel'
import { NOTICES } from '../../lib/notices'
import { useMeeting } from '../../state/meetingContext'

/**
 * Messagerie de réunion.
 * Phase 1 : le chat est désactivé. Les champs sont volontairement inertes —
 * aucun message n'est envoyé, enregistré ou simulé.
 */
export function ChatPanel() {
  const { closePanel } = useMeeting()

  return (
    <SidePanel
      title="Chat"
      icon={MessageSquare}
      onClose={closePanel}
      footer={
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              disabled
              aria-label="Message (indisponible)"
              placeholder="Chat indisponible"
              className="h-10 min-w-0 flex-1 cursor-not-allowed rounded-xl border border-ink-600 bg-ink-850 px-3 text-sm text-slate-400 placeholder:text-slate-500"
            />
            <Button variant="secondary" size="sm" disabled aria-label="Envoyer (indisponible)">
              <Send aria-hidden="true" className="size-4" />
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Le champ est désactivé : rien n&apos;est transmis ni stocké.
          </p>
        </div>
      }
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-600 px-4 py-10 text-center">
          <MessageSquare aria-hidden="true" className="size-6 text-slate-500" />
          <p className="text-sm font-medium text-slate-300">Aucun message</p>
          <p className="max-w-xs text-xs leading-relaxed text-slate-500">
            Les échanges écrits arriveront avec la connexion temps réel.
          </p>
        </div>

        <Notice
          tone="info"
          title="Chat non disponible"
          action={
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Info aria-hidden="true" className="size-3.5" />
              Aucun message n&apos;est transmis ni conservé.
            </span>
          }
        >
          {NOTICES.chat}
        </Notice>
      </div>
    </SidePanel>
  )
}