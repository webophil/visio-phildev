import { RealtimeKitTransport } from './RealtimeKitTransport'
import type { MeetingTransport, MeetingTransportOptions } from './types'

export type { MeetingTransport, MeetingTransportOptions } from './types'
export { RealtimeKitTransport }

/**
 * Fabrique de transport utilisée par la couche état.
 * Les composants ne dépendent que de `MeetingTransport` : remplacer
 * l'infrastructure temps réel ne les touche pas.
 */
export function createTransport(options: MeetingTransportOptions): MeetingTransport {
  return new RealtimeKitTransport(options)
}
