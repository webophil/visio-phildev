import { Mic, MicOff, MonitorUp, UserRound, Users, Video, VideoOff } from 'lucide-react'

import { Notice } from '../ui/Notice'
import { SidePanel } from '../ui/SidePanel'
import { PHASE_2 } from '../../lib/notices'
import { useMeeting } from '../../state/meetingContext'

/**
 * Liste des participants.
 * Phase 1 : un seul entrant possible — vous. Aucun participant distant n'est
 * inventé pour remplir l'interface.
 */
export function ParticipantsPanel() {
  const { localParticipant, closePanel } = useMeeting()

  return (
    <SidePanel title="Participants" icon={Users} onClose={closePanel}>
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          1 participant dans la salle
        </p>

        <ul className="flex flex-col gap-1">
          <li className="flex items-center gap-3 rounded-xl bg-ink-850 px-3 py-2.5">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full border border-ink-600 bg-ink-800 text-sm font-semibold text-accent-200"
            >
              {localParticipant.displayName.slice(0, 1).toUpperCase()}
            </span>

            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-white">
                {localParticipant.displayName}
              </span>
              <span className="text-xs text-slate-400">Vous (participant local)</span>
            </span>

            <span className="flex items-center gap-2 text-slate-300">
              {localParticipant.audioEnabled ? (
                <Mic aria-label="Micro actif" className="size-4 text-emerald-300" />
              ) : (
                <MicOff aria-label="Micro coupé" className="size-4 text-rose-300" />
              )}
              {localParticipant.videoEnabled ? (
                <Video aria-label="Caméra active" className="size-4 text-emerald-300" />
              ) : (
                <VideoOff aria-label="Caméra coupée" className="size-4 text-rose-300" />
              )}
              {localParticipant.screenSharing ? (
                <MonitorUp aria-label="Partage d'écran actif" className="size-4 text-accent-300" />
              ) : null}
            </span>
          </li>
        </ul>

        <div className="flex items-start gap-2 rounded-xl border border-dashed border-ink-600 p-3 text-xs text-slate-400">
          <UserRound aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            Aucun autre participant. Les invités apparaîtront ici dès que le transport temps réel
            sera branché.
          </p>
        </div>

        <Notice tone="info" title="Phase 2 — participants distants">
          {PHASE_2.remoteParticipantsPanel}
        </Notice>
      </div>
    </SidePanel>
  )
}
