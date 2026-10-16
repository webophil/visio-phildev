import type { RTKParticipant } from '@cloudflare/realtimekit'
import { useRealtimeKitMeeting, useRealtimeKitSelector } from '@cloudflare/realtimekit-react'
import { MicOff, MonitorOff, MonitorUp, Radio } from 'lucide-react'

import { Button } from '../ui/Button'
import { RemoteScreenShare, RtkParticipantVideo, RtkSelfVideo, SelfScreenShareView } from './RtkVideoSurface'
import { VideoPlaceholder } from './VideoSurface'
import { NOTICES } from '../../lib/notices'
import { useMeeting } from '../../state/meetingContext'

/**
 * Scène principale de la réunion.
 * - partage d'écran en cours : l'écran occupe la scène, les caméras passent en
 *   vignettes (incrustation conservée pour la caméra locale) ;
 * - sinon : grille des caméras, participant local inclus.
 * Toutes les images proviennent du SDK : aucune vignette n'est simulée.
 */
export function MeetingStage() {
  const { participantName, setScreenShareEnabled } = useMeeting()
  const { meeting } = useRealtimeKitMeeting()

  const remotes = useRealtimeKitSelector((client) => client.participants.joined.toArray())
  const selfVideoEnabled = useRealtimeKitSelector((client) => client.self.videoEnabled)
  const selfScreenSharing = useRealtimeKitSelector((client) => client.self.screenShareEnabled)

  const displayName = participantName.trim() || 'Vous'
  const sharingRemote = remotes.find((participant) => participant.screenShareEnabled)
  const sharing = selfScreenSharing || Boolean(sharingRemote)

  if (sharing) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col gap-3">
        {selfScreenSharing ? (
          <SelfScreenShareView
            self={meeting.self}
            label="Votre écran partagé"
            className="min-h-0 flex-1 rounded-2xl border border-ink-700"
            placeholder={
              <VideoPlaceholder
                title="Partage d’écran"
                subtitle="Le partage est en cours de démarrage : autorisez la capture si le navigateur le demande."
              />
            }
          />
        ) : sharingRemote ? (
          <RemoteScreenShare
            participant={sharingRemote}
            label={`Écran partagé par ${sharingRemote.name}`}
            className="min-h-0 flex-1 rounded-2xl border border-ink-700"
            placeholder={
              <VideoPlaceholder
                title={`Écran de ${sharingRemote.name}`}
                subtitle="L’image arrive dès que le partage est établi."
              />
            }
          />
        ) : null}

        {/* Incrustation webcam : la caméra reste visible pendant le partage. */}
        <div className="absolute top-4 right-4 w-28 overflow-hidden rounded-xl border border-ink-600 shadow-lg shadow-black/50 sm:w-44">
          <RtkSelfVideo
            self={meeting.self}
            enabled={selfVideoEnabled}
            label="Votre caméra"
            className="aspect-video"
            placeholder={<span className="text-[11px] text-slate-300">{displayName}</span>}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-700 bg-ink-900 px-4 py-3">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
            <Radio aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-300" />
            {selfScreenSharing
              ? NOTICES.screenShareNote
              : `${sharingRemote?.name ?? 'Un participant'} partage son écran.`}
          </p>

          {selfScreenSharing ? (
            <Button variant="danger" size="sm" onClick={() => void setScreenShareEnabled(false)}>
              <MonitorOff aria-hidden="true" className="size-4" />
              Arrêter le partage
            </Button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <MonitorUp aria-hidden="true" className="size-4 text-accent-300" />
              Partage en cours
            </span>
          )}
        </div>

        {remotes.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {remotes.map((participant) => (
              <RemoteTile key={participant.id} participant={participant} compact />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="grid min-h-0 flex-1 auto-rows-fr gap-3 sm:grid-cols-2">
      <SelfTile name={displayName} />
      {remotes.map((participant) => (
        <RemoteTile key={participant.id} participant={participant} />
      ))}

      {remotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-600 bg-ink-900/60 p-6 text-center sm:col-span-1">
          <MonitorUp aria-hidden="true" className="size-6 text-slate-500" />
          <p className="text-sm font-medium text-slate-300">Personne n’a encore rejoint</p>
          <p className="max-w-xs text-xs leading-relaxed text-slate-400">
            Partagez le lien d’invitation : les participants apparaîtront ici dès qu’ils seront
            connectés. Aucune vignette n’est affichée à vide.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function SelfTile({ name }: { name: string }) {
  const { meeting } = useRealtimeKitMeeting()
  const videoEnabled = useRealtimeKitSelector((client) => client.self.videoEnabled)
  const audioEnabled = useRealtimeKitSelector((client) => client.self.audioEnabled)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-700">
      <RtkSelfVideo
        self={meeting.self}
        enabled={videoEnabled}
        label={`Votre flux vidéo (${name})`}
        className="size-full min-h-40"
        placeholder={
          <VideoPlaceholder
            title={name}
            subtitle={
              videoEnabled
                ? 'Aucune image : votre caméra est peut-être déjà utilisée ailleurs.'
                : 'Votre caméra est coupée. Réactivez-la depuis la barre de contrôle.'
            }
          />
        }
      />
      <TileFooter name={name} audioEnabled={audioEnabled} isLocal />
    </div>
  )
}

function RemoteTile({ participant, compact = false }: { participant: RTKParticipant; compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? 'relative w-40 shrink-0 overflow-hidden rounded-xl border border-ink-700'
          : 'relative overflow-hidden rounded-2xl border border-ink-700'
      }
    >
      <RtkParticipantVideo
        participant={participant}
        enabled={participant.videoEnabled}
        label={`Flux vidéo de ${participant.name}`}
        className={compact ? 'aspect-video' : 'size-full min-h-40'}
        placeholder={
          <VideoPlaceholder
            title={participant.name}
            subtitle={compact ? undefined : 'Caméra coupée : le participant est bien connecté.'}
          />
        }
      />
      <TileFooter name={participant.name} audioEnabled={participant.audioEnabled} isHost={participant.isHost} />
    </div>
  )
}

interface TileFooterProps {
  name: string
  audioEnabled: boolean
  isHost?: boolean
  isLocal?: boolean
}

function TileFooter({ name, audioEnabled, isHost = false, isLocal = false }: TileFooterProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-linear-to-t from-ink-950/85 to-transparent px-3 pt-8 pb-2">
      <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-white">
        <span className="truncate">
          {name}
          {isLocal ? ' (vous)' : ''}
        </span>
        {isHost ? (
          <span className="rounded-full bg-accent-500/20 px-1.5 py-0.5 text-[10px] text-accent-100">
            Organisateur
          </span>
        ) : null}
      </span>

      {!audioEnabled ? (
        <MicOff aria-label="Micro coupé" className="size-3.5 shrink-0 text-rose-300" />
      ) : null}
    </div>
  )
}
