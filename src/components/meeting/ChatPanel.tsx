import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { MessageSquare, Send, ShieldOff } from 'lucide-react'

import { Button } from '../ui/Button'
import { Notice } from '../ui/Notice'
import { SidePanel } from '../ui/SidePanel'
import { formatClockTime } from '../../lib/format'
import { NOTICES } from '../../lib/notices'
import { useMeeting } from '../../state/meetingContext'
import type { ChatMessageView } from '../../types/meeting'

/**
 * Messagerie de réunion.
 *
 * Le panneau est branché sur la **messagerie native** de Cloudflare RealtimeKit :
 * les messages circulent entre les participants connectés et ne sont ni
 * enregistrés ni relus après la réunion. Quand le profil de participant
 * n'autorise pas le chat, le panneau l'annonce explicitement et conserve un
 * champ désactivé plutôt que d'afficher une saisie sans effet.
 */
export function ChatPanel() {
  const { closePanel, chat, sendChatMessage } = useMeeting()
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)

  // Défilement automatique vers le dernier message reçu ou envoyé.
  useEffect(() => {
    const node = listRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [chat.messages.length])

  const canWrite = chat.available && chat.canSend
  const busy = chat.sending

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (text.length === 0 || !canWrite || busy) return

    // Le brouillon n'est effacé qu'une fois le message accepté par le SDK :
    // un échec laisse la saisie intacte pour réessayer.
    const sent = await sendChatMessage(text)
    if (sent) setDraft((current) => (current.trim() === text ? '' : current))
  }

  return (
    <SidePanel
      title="Chat"
      icon={MessageSquare}
      onClose={closePanel}
      footer={
        <form className="flex flex-col gap-2" onSubmit={(event) => void handleSubmit(event)}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              maxLength={chat.maxTextLength}
              disabled={!canWrite}
              enterKeyHint="send"
              aria-label="Votre message"
              placeholder={canWrite ? 'Écrire un message…' : 'Chat indisponible'}
              className="h-11 min-w-0 flex-1 rounded-xl border border-ink-600 bg-ink-850 px-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-accent-500 focus:outline-none disabled:cursor-not-allowed disabled:text-slate-500 sm:text-sm"
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="h-11"
              disabled={!canWrite || busy || draft.trim().length === 0}
              aria-label="Envoyer le message"
            >
              <Send aria-hidden="true" className="size-4" />
            </Button>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            {canWrite
              ? `Entrée pour envoyer · ${draft.length}/${chat.maxTextLength} caractères.`
              : 'La saisie est désactivée : aucun message ne peut être envoyé.'}
          </p>
        </form>
      }
    >
      <div className="flex h-full flex-col gap-3">
        {chat.available ? null : (
          <Notice
            tone="warning"
            title="Chat indisponible"
            action={
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldOff aria-hidden="true" className="size-3.5" />
                Profil de participant
              </span>
            }
          >
            {chat.unavailableReason ?? NOTICES.chatUnavailable}
          </Notice>
        )}

        {chat.error ? (
          <Notice tone="danger" title="Message non envoyé">
            {chat.error}
          </Notice>
        ) : null}

        {chat.messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-600 px-4 py-10 text-center">
            <MessageSquare aria-hidden="true" className="size-6 text-slate-500" />
            <p className="text-sm font-medium text-slate-300">Aucun message</p>
            <p className="max-w-xs text-xs leading-relaxed text-slate-500">
              {chat.available
                ? 'Les messages apparaissent ici dès qu’un participant écrit. Ils ne sont pas conservés après la réunion.'
                : 'Ce panneau restera vide tant que le chat n’est pas autorisé pour votre profil.'}
            </p>
          </div>
        ) : (
          <div
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-label="Messages de la réunion"
            className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5"
          >
            {chat.messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
          </div>
        )}

        <Notice tone="info" title="Messages non conservés" className="text-xs">
          {NOTICES.chat}
        </Notice>
      </div>
    </SidePanel>
  )
}

function ChatBubble({ message }: { message: ChatMessageView }) {
  return (
    <article
      className={[
        // `min-w-0` : sans lui, un mot très long élargit la bulle, puis le
        // panneau, puis comprime la scène vidéo.
        'flex min-w-0 max-w-[92%] flex-col gap-0.5 rounded-xl px-3 py-2',
        message.isLocal
          ? 'self-end border border-accent-500/40 bg-accent-500/10'
          : 'self-start border border-ink-600 bg-ink-850',
      ].join(' ')}
    >
      <header className="flex min-w-0 items-baseline gap-2">
        <span className="truncate text-xs font-semibold text-white">
          {message.isLocal ? 'Vous' : message.authorName}
        </span>
        <time
          dateTime={new Date(message.sentAt).toISOString()}
          className="shrink-0 font-mono text-[10px] text-slate-500 tabular-nums"
        >
          {formatClockTime(message.sentAt)}
        </time>
      </header>
      <p className="text-sm leading-relaxed break-words whitespace-pre-wrap [overflow-wrap:anywhere] text-slate-100">
        {message.text}
      </p>
    </article>
  )
}
