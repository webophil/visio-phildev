import type { TransportState } from '../../types/meeting'
import type { MeetingTransport, MeetingTransportOptions } from './types'

/**
 * Transport Phase 1 : strictement local.
 *
 * Garanties volontaires :
 * - aucune connexion réseau, aucun RTCPeerConnection, aucune signalisation ;
 * - `supportsRemoteParticipants: false` et `connection: 'local'`, afin que
 *   l'interface ne puisse jamais annoncer un participant distant inexistant ;
 * - les flux locaux sont conservés en référence uniquement (aucun envoi).
 */
export class LocalOnlyTransport implements MeetingTransport {
  readonly meetingId: string

  private readonly displayName: string
  private listeners = new Set<(state: TransportState) => void>()
  private localStream: MediaStream | null = null
  private screenStream: MediaStream | null = null

  private state: TransportState = {
    mode: 'local-only',
    supportsRemoteParticipants: false,
    connection: 'local',
  }

  constructor(options: MeetingTransportOptions) {
    this.meetingId = options.meetingId
    this.displayName = options.displayName
  }

  getState(): TransportState {
    return this.state
  }

  subscribe(listener: (state: TransportState) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async join(): Promise<void> {
    // Aucune négociation réseau en Phase 1 : l'état reste explicitement local.
    this.emit()
  }

  async leave(): Promise<void> {
    this.localStream = null
    this.screenStream = null
    this.listeners.clear()
  }

  async publishLocalMedia(stream: MediaStream | null): Promise<void> {
    this.localStream = stream
  }

  async publishScreenShare(stream: MediaStream | null): Promise<void> {
    this.screenStream = stream
  }

  setMicrophoneEnabled(_enabled: boolean): void {
    // Le pilotage du micro est assuré localement par `useLocalMedia`.
    this.emit()
  }

  setCameraEnabled(_enabled: boolean): void {
    this.emit()
  }

  /**
   * Instantané de diagnostic du transport local.
   * Utile pour la mise au point : expose le nom déclaré et la présence des
   * flux locaux, sans jamais les transmettre.
   */
  describeLocalSession(): {
    meetingId: string
    displayName: string
    hasLocalStream: boolean
    hasScreenStream: boolean
  } {
    return {
      meetingId: this.meetingId,
      displayName: this.displayName,
      hasLocalStream: this.localStream !== null,
      hasScreenStream: this.screenStream !== null,
    }
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state)
    }
  }
}