import { Crown, Mic, MicOff, MonitorUp, Users, Video, VideoOff } from 'lucide-react'

import { Notice } from '../ui/Notice'
import { SidePanel } from '../ui/SidePanel'
import { NOTICES } from '../../lib/notices'
import { pluralize } from '../../lib/format'
import { useMeeting } from '../../state/meetingContext'
import type { ParticipantView } from '../../types/meeting'

/**
 * Liste des participants **réellement présents**, telle que rapportée par le
 * SDK. Aucun participant n'est affiché à titre d'exemple : la liste se vide
 * quand la salle se vide.
 */
export function ParticipantsPanel() {
  const { closePanel, session } = useMeeting()
  const participants = session.participants
  const capacity = session.maxParticipants

  return (
    <SidePanel title="Participants" icon={Users} onClose={closePanel}>
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          {participants.length} {pluralize(participants.length, 'participant', 'participants')} sur{' '}
          {capacity}
        </p>

        <ul className="flex flex-col gap-1">
          {participants.map((participant) => (
            <ParticipantRow key={participant.id} participant={participant} />
          ))}
        </ul>

        {participants.length <= 1 ? (
          <div className="flex items-start gap-2 rounded-xl border border-dashed border-ink-600 p-3 text-xs text-slate-400">
            <Users aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              Vous êtes seul pour l’instant. Chaque personne qui ouvre le lien d’invitation apparaît
              ici dès qu’elle rejoint la salle.
            </p>
          </div>
        ) : null}

        <Notice tone="info" title="Capacité de la réunion">
          {NOTICES.capacity}
        </Notice>
      </div>
    </SidePanel>
  )
}

function ParticipantRow({ participant }: { participant: ParticipantView }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-ink-850 px-3 py-2.5">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full border border-ink-600 bg-ink-800 text-sm font-semibold text-accent-200"
      >
        {participant.name.slice(0, 1).toUpperCase()}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5 truncate text-sm font-medium text-white">
          {participant.name}
          {participant.isHost ? (
            <Crown aria-label="Organisateur" className="size-3.5 text-amber-300" />
          ) : null}
        </span>
        <span className="text-xs text-slate-400">
          {participant.isLocal ? 'Vous' : 'Invité'}
          {participant.screenShareEnabled ? ' · partage son écran' : ''}
        </span>
      </span>

      <span className="flex items-center gap-2 text-slate-300">
        {participant.audioEnabled ? (
          <Mic aria-label="Micro actif" className="size-4 text-emerald-300" />
        ) : (
          <MicOff aria-label="Micro coupé" className="size-4 text-rose-300" />
        )}
        {participant.videoEnabled ? (
          <Video aria-label="Caméra active" className="size-4 text-emerald-300" />
        ) : (
          <VideoOff aria-label="Caméra coupée" className="size-4 text-rose-300" />
        )}
        {participant.screenShareEnabled ? (
          <MonitorUp aria-label="Partage d'écran actif" className="size-4 text-accent-300" />
        ) : null}
      </span>
    </li>
  )
}
