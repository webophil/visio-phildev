/**
 * Types du domaine « réunion ».
 * Ils constituent l'interface publique consommée par les composants : les
 * objets du SDK RealtimeKit (Phase 2) seront traduits vers ces types par
 * l'adaptateur de transport, jamais exposés directement à l'UI.
 */

export type SessionPhase = 'prejoin' | 'in-meeting'

export type SidePanelId = 'participants' | 'chat' | 'effects'

export type MediaKind = 'audio' | 'video'

/** État d'accès à un périphérique (un état par famille de périphérique). */
export type MediaAccessState = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

export interface MediaDeviceOption {
  deviceId: string
  label: string
}

export interface MediaDeviceList {
  audioInputs: MediaDeviceOption[]
  videoInputs: MediaDeviceOption[]
}

export const EMPTY_DEVICE_LIST: MediaDeviceList = { audioInputs: [], videoInputs: [] }

/** Participant local : le seul participant réellement présent en Phase 1. */
export interface LocalParticipant {
  displayName: string
  audioEnabled: boolean
  videoEnabled: boolean
  screenSharing: boolean
}

export type TransportMode = 'local-only' | 'realtimekit'

/**
 * État de connexion du transport.
 * `local` signifie explicitement : aucune connexion réseau n'est établie.
 */
export type TransportConnectionState =
  | 'local'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'

export interface TransportState {
  mode: TransportMode
  supportsRemoteParticipants: boolean
  connection: TransportConnectionState
}
