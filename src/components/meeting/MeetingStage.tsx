import { Info, MonitorOff, MonitorUp } from 'lucide-react'

import { Button } from '../ui/Button'
import { Notice } from '../ui/Notice'
import { VideoPlaceholder, VideoSurface } from './VideoSurface'
import { PHASE_2 } from '../../lib/notices'
import { useMeeting } from '../../state/meetingContext'

/**
 * Scène principale.
 * - sans partage d'écran : la caméra locale occupe la scène ;
 * - avec partage d'écran : le flux d'écran passe au premier plan et la caméra
 *   locale devient une vignette secondaire.
 * Seuls des flux réellement capturés sont affichés.
 */
export function MeetingStage() {
  const { media, screenShare, participantName, localParticipant } = useMeeting()

  const sharing = screenShare.status === 'active'
  const hasCamera = media.hasVideoTrack && media.videoEnabled
  const displayName = participantName.trim() || 'Vous'

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-3">
      {screenShare.status === 'error' && screenShare.failure ? (
        <Notice
          tone="warning"
          title={screenShare.failure.title}
          action={
            screenShare.supported ? (
              <Button variant="secondary" size="sm" onClick={() => void screenShare.start()}>
                <MonitorUp aria-hidden="true" className="size-4" />
                Réessayer le partage
              </Button>
            ) : null
          }
        >
          {screenShare.failure.message}
        </Notice>
      ) : null}

      <VideoSurface
        stream={sharing ? screenShare.stream : media.stream}
        active={sharing ? Boolean(screenShare.stream) : hasCamera}
        objectFit={sharing ? 'contain' : 'cover'}
        label={sharing ? 'Votre écran partagé' : `Flux vidéo de ${displayName}`}
        mirrored={!sharing}
        className="min-h-0 flex-1 rounded-2xl border border-ink-700"
        placeholder={
          <VideoPlaceholder
            title={sharing ? 'Partage d’écran' : displayName}
            subtitle={
              sharing
                ? 'Le partage est en cours de démarrage…'
                : media.videoEnabled
                  ? 'Aucune image : votre caméra est peut-être déjà utilisée ailleurs, ou l’autorisation a été refusée.'
                  : 'Votre caméra est coupée. Vous pouvez la réactiver depuis la barre de contrôle.'
            }
          />
        }
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 bg-linear-to-t from-ink-950/85 to-transparent px-4 pt-12 pb-3">
          <span className="flex items-center gap-2 text-sm font-medium text-white">
            {sharing ? 'Votre écran' : displayName}
            {!sharing && !localParticipant.audioEnabled ? (
              <span className="rounded-full bg-ink-900/80 px-2 py-0.5 text-[11px] text-rose-200">
                Micro coupé
              </span>
            ) : null}
          </span>

          {sharing ? (
            <span className="flex items-center gap-1.5 text-xs text-slate-300">
              <MonitorUp aria-hidden="true" className="size-3.5 text-accent-300" />
              Partage en cours
            </span>
          ) : null}
        </div>

        {sharing ? (
          <div className="absolute bottom-16 right-4 w-36 overflow-hidden rounded-xl border border-ink-600 shadow-lg shadow-black/50 sm:bottom-4 sm:w-52">
            <VideoSurface
              stream={media.stream}
              active={hasCamera}
              mirrored
              label="Votre caméra"
              className="aspect-video"
              placeholder={<span className="text-xs text-slate-400">{displayName}</span>}
            />
          </div>
        ) : null}
      </VideoSurface>

      {sharing ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-700 bg-ink-900 px-4 py-3">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-300" />
            {PHASE_2.screenShareNote}
          </p>
          <Button variant="danger" size="sm" onClick={screenShare.stop}>
            <MonitorOff aria-hidden="true" className="size-4" />
            Arrêter le partage
          </Button>
        </div>
      ) : null}
    </div>
  )
}
