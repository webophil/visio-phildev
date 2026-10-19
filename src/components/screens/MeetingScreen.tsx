import { RealtimeKitProvider } from '@cloudflare/realtimekit-react'
import {
  Clock,
  Crown,
  Info,
  Loader2,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react'

import { PhilDevLogo } from '../Brand/PhilDevLogo'
import { BackgroundEffectsPanel } from '../meeting/BackgroundEffectsPanel'
import { ChatPanel } from '../meeting/ChatPanel'
import { ControlBar } from '../meeting/ControlBar'
import { InviteLinkButton } from '../meeting/InviteLinkButton'
import { MeetingStage } from '../meeting/MeetingStage'
import { ParticipantsPanel } from '../meeting/ParticipantsPanel'
import { RemoteAudioSinks } from '../meeting/RemoteAudio'
import { Button } from '../ui/Button'
import { Notice } from '../ui/Notice'
import { StatusPill } from '../ui/StatusPill'
import { formatDuration, pluralize } from '../../lib/format'
import { NOTICES } from '../../lib/notices'
import { useMeeting } from '../../state/meetingContext'

/**
 * Interface de réunion.
 * Toutes les informations affichées proviennent de la session réelle : nombre
 * de participants connectés, état de connexion, durée mesurée localement et
 * erreurs remontées par le SDK.
 */
export function MeetingScreen() {
  const { client } = useMeeting()

  if (!client) return <ConnectingScreen />

  return (
    <RealtimeKitProvider value={client}>
      <MeetingLayout />
    </RealtimeKitProvider>
  )
}

function MeetingLayout() {
  const { meetingName, meetingId, durationMs, activePanel, closePanel, transport, session, isHost, clearSessionError } =
    useMeeting()

  const participantCount = session.participants.length
  const connectionLabel =
    transport.connection === 'connected'
      ? 'Connecté'
      : transport.connection === 'reconnecting'
        ? 'Reconnexion…'
        : transport.connection === 'connecting'
          ? 'Connexion…'
          : 'Déconnecté'

  return (
    /*
     * Hauteur **fixée au viewport** et débordement masqué : la scène se partage
     * l'espace restant, quel que soit le contenu du panneau latéral. Sans cela,
     * un long message de chat allongeait la page et agrandissait les vignettes.
     */
    <div className="flex h-dvh flex-col overflow-hidden bg-ink-950">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-ink-800 bg-ink-900/80 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <PhilDevLogo size="sm" />
          <span aria-hidden="true" className="hidden h-6 w-px bg-ink-700 sm:block" />
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-sm font-semibold text-white">{meetingName}</h1>
            <p className="truncate font-mono text-[11px] text-slate-500">/rdv-{meetingId}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isHost ? (
            <StatusPill tone="neutral" icon={<Crown aria-hidden="true" className="size-3.5 text-amber-300" />}>
              Organisateur
            </StatusPill>
          ) : null}

          <StatusPill tone="neutral" icon={<Clock aria-hidden="true" className="size-3.5" />}>
            <span className="tabular-nums" aria-label="Durée de la réunion">
              {formatDuration(durationMs)}
            </span>
          </StatusPill>

          <StatusPill tone="info" icon={<Users aria-hidden="true" className="size-3.5" />}>
            {participantCount} {pluralize(participantCount, 'participant', 'participants')}
          </StatusPill>

          <StatusPill
            tone={transport.connection === 'connected' ? 'info' : 'warning'}
            icon={
              transport.connection === 'connected' ? (
                <Wifi aria-hidden="true" className="size-3.5" />
              ) : transport.connection === 'disconnected' ? (
                <WifiOff aria-hidden="true" className="size-3.5" />
              ) : (
                <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
              )
            }
          >
            {connectionLabel}
          </StatusPill>

          <InviteLinkButton />
        </div>
      </header>

      {session.error ? (
        <div className="shrink-0 px-4 pt-3 sm:px-6">
          <Notice
            tone="danger"
            title="Réunion"
            action={
              <Button variant="secondary" size="sm" onClick={clearSessionError}>
                Masquer
              </Button>
            }
          >
            {session.error.message}
          </Notice>
        </div>
      ) : null}

      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:p-4 lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
          {/* Sortie audio des voix distantes : montée ici, donc indépendante de
              la disposition affichée par la scène. */}
          <RemoteAudioSinks />
          <MeetingStage />
          <ControlBar />
        </div>

        {activePanel === 'participants' ? <ParticipantsPanel /> : null}
        {activePanel === 'chat' ? <ChatPanel /> : null}
        {activePanel === 'effects' ? <BackgroundEffectsPanel /> : null}
      </main>

      <footer className="flex shrink-0 flex-col gap-2 px-4 pb-4 sm:px-6">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-400">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-slate-500" />
          {NOTICES.capacity}
        </p>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Votre flux audio et vidéo est transmis aux participants de cette réunion via Cloudflare
          RealtimeKit. Il n’est ni enregistré ni conservé par l’application.
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

/** Attente de l'initialisation du client RealtimeKit (avant la première image). */
function ConnectingScreen() {
  return (
    <div className="stage-backdrop flex min-h-dvh flex-col items-center justify-center gap-4 text-center">
      <Loader2 aria-hidden="true" className="size-8 animate-spin text-accent-300" />
      <h1 className="font-display text-xl font-semibold text-white">Connexion à la réunion…</h1>
      <p className="max-w-sm text-sm text-slate-400">
        Ouverture de la salle Cloudflare RealtimeKit. Cette étape dure quelques secondes.
      </p>
    </div>
  )
}
