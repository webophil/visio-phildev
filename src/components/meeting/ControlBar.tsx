import {
  MessageSquare,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Users,
  Video,
  VideoOff,
  WandSparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { ControlButton } from '../ui/ControlButton'
import { useMeeting } from '../../state/meetingContext'
import type { SidePanelId } from '../../types/meeting'

/**
 * Barre de contrôle de la réunion.
 * Chaque bouton reflète un état réel : micro, caméra et partage d'écran
 * agissent directement sur les pistes MediaStream en cours.
 */
export function ControlBar() {
  const { media, screenShare, activePanel, togglePanel, leaveMeeting } = useMeeting()

  const micActive = media.audioEnabled && media.hasAudioTrack
  const cameraActive = media.videoEnabled && media.hasVideoTrack
  const sharing = screenShare.status === 'active'
  const sharePending = screenShare.status === 'requesting'

  const panelButton = (panel: SidePanelId, label: string, icon: LucideIcon, badge?: string) => (
    <ControlButton
      icon={icon}
      label={label}
      badge={badge}
      pressed={activePanel === panel}
      onClick={() => togglePanel(panel)}
    />
  )

  return (
    <div className="surface-panel flex flex-wrap items-center justify-center gap-2 rounded-2xl p-2.5 sm:gap-2.5 sm:p-3">
      {/* La bascule se fonde sur l'état réel de la piste : si le micro n'est pas
          actif (autorisation refusée, matériel débranché), un appui tente de le
          rétablir au lieu de simplement basculer l'intention. */}
      <ControlButton
        icon={micActive ? Mic : MicOff}
        label={micActive ? 'Micro' : 'Micro coupé'}
        pressed={micActive}
        off={!micActive}
        onClick={() => void media.setAudioEnabled(!micActive)}
      />

      <ControlButton
        icon={cameraActive ? Video : VideoOff}
        label={cameraActive ? 'Caméra' : 'Caméra coupée'}
        pressed={cameraActive}
        off={!cameraActive}
        onClick={() => void media.setVideoEnabled(!cameraActive)}
      />

      <ControlButton
        icon={sharing ? MonitorOff : MonitorUp}
        label={
          sharing ? 'Arrêter le partage' : sharePending ? 'Partage en cours…' : 'Partager l’écran'
        }
        pressed={sharing}
        highlighted={sharing}
        disabled={sharePending || (!screenShare.supported && !sharing)}
        title={
          screenShare.supported
            ? 'Partager un écran, une fenêtre ou un onglet'
            : 'Partage d’écran non pris en charge par ce navigateur'
        }
        onClick={() => {
          if (sharing) {
            screenShare.stop()
          } else {
            void screenShare.start()
          }
        }}
      />

      <span aria-hidden="true" className="mx-1 hidden h-10 w-px bg-ink-700 sm:block" />

      {panelButton('participants', 'Participants', Users, '1')}
      {panelButton('chat', 'Chat', MessageSquare)}
      {panelButton('effects', 'Effets', WandSparkles)}

      <span aria-hidden="true" className="mx-1 hidden h-10 w-px bg-ink-700 sm:block" />

      <ControlButton
        icon={PhoneOff}
        label="Quitter"
        tone="danger"
        onClick={() => void leaveMeeting()}
      />
    </div>
  )
}