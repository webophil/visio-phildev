import type { TransportState } from '../../types/meeting'

/**
 * Frontière d'intégration vers l'infrastructure temps réel.
 *
 * Phase 1 : `LocalOnlyTransport` est la seule implémentation. Elle ne parle à
 * aucun serveur, ne crée aucun RTCPeerConnection et ne simule aucun participant
 * distant.
 *
 * Phase 2 : un `RealtimeKitTransport` (Cloudflare RealtimeKit, SFU) implémentera
 * cette même interface. Le navigateur n'aura jamais accès au jeton d'API
 * Cloudflare : seul un jeton participant, délivré par un Worker, sera utilisé.
 * Aucune modification des composants ne sera nécessaire.
 */
export interface MeetingTransportOptions {
  meetingId: string
  displayName: string
}

export interface MeetingTransport {
  readonly meetingId: string

  /** État courant du transport (mode, connexion, capacités). */
  getState(): TransportState

  /** Observe les changements d'état ; renvoie la fonction de désabonnement. */
  subscribe(listener: (state: TransportState) => void): () => void

  /** Rejoint la session. */
  join(): Promise<void>

  /** Quitte la session et libère les ressources du transport. */
  leave(): Promise<void>

  /** Déclare le flux local (caméra / micro) auprès du transport. */
  publishLocalMedia(stream: MediaStream | null): Promise<void>

  /** Déclare le flux de partage d'écran auprès du transport. */
  publishScreenShare(stream: MediaStream | null): Promise<void>

  setMicrophoneEnabled(enabled: boolean): void

  setCameraEnabled(enabled: boolean): void
}

export type MeetingTransportFactory = (options: MeetingTransportOptions) => MeetingTransport
