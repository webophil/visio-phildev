import { Clock, Info, ShieldCheck, Users, WifiOff } from 'lucide-react'

import { PhilDevLogo } from '../Brand/PhilDevLogo'
import { BackgroundEffectsPanel } from '../meeting/BackgroundEffectsPanel'
import { ChatPanel } from '../meeting/ChatPanel'
import { ControlBar } from '../meeting/ControlBar'
import { InviteLinkButton } from '../meeting/InviteLinkButton'
import { MeetingStage } from '../meeting/MeetingStage'
import { ParticipantsPanel } from '../meeting/ParticipantsPanel'
import { StatusPill } from '../ui/StatusPill'
import { formatDuration, pluralize } from '../../lib/format'
import { PHASE_2 } from '../../lib/notices'
import { useMeeting } from '../../state/meetingContext'

/**
 * Interface de réunion.
 * Toutes les informations affichées proviennent de l'état réel : durée mesurée
 * localement, participant unique, état du transport. Aucune connectivité ni
 * participant distant n'est suggéré.
 */
export function MeetingScreen() {
  const { meetingName, meetingId, durationMs, activePanel, closePanel, transport } = useMeeting()

  const participantCount = 1
  const connectionLabel =
    transport.connection === 'connected' ? 'Connecté' : 'Session locale (aucun serveur)'

  return (
    <div className="flex min-h-dvh flex-col bg-ink-950">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-800 bg-ink-900/80 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <PhilDevLogo size="sm" />
          <span aria-hidden="true" className="hidden h-6 w-px bg-ink-700 sm:block" />
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-sm font-semibold text-white">{meetingName}</h1>
            <p className="truncate font-mono text-[11px] text-slate-500">/rdv-{meetingId}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusPill
            tone="neutral"
            icon={<Clock aria-hidden="true" className="size-3.5" />}
          >
            <span className="tabular-nums" aria-label="Durée de la réunion">
              {formatDuration(durationMs)}
            </span>
          </StatusPill>

          <StatusPill
            tone="info"
            icon={<Users aria-hidden="true" className="size-3.5" />}
          >
            {participantCount} {pluralize(participantCount, 'participant', 'participants')}
          </StatusPill>

          <StatusPill
            tone={transport.connection === 'connected' ? 'info' : 'warning'}
            icon={<WifiOff aria-hidden="true" className="size-3.5" />}
          >
            {connectionLabel}
          </StatusPill>

          <InviteLinkButton />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4 lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <MeetingStage />
          <ControlBar />
        </div>

        {activePanel === 'participants' ? <ParticipantsPanel /> : null}
        {activePanel === 'chat' ? <ChatPanel /> : null}
        {activePanel === 'effects' ? <BackgroundEffectsPanel /> : null}
      </main>

      <footer className="flex flex-col gap-2 px-4 pb-4 sm:px-6">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-400">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-slate-500" />
          {PHASE_2.remoteParticipants}
        </p>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Votre flux audio et vidéo n&apos;est transmis à aucun serveur en Phase 1.
        </p>
      </footer>

      {activePanel ? (
        <button
          type="button"
          aria-label="Fermer le panneau"
          onClick={closePanel}
          className="fixed inset-0 z-20 bg-ink-950/60 lg:hidden"
        />
      ) : null}
    </div>
  )
}