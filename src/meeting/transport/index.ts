import { LocalOnlyTransport } from './LocalOnlyTransport'
import type { MeetingTransport, MeetingTransportOptions } from './types'

export type { MeetingTransport, MeetingTransportOptions } from './types'
export { LocalOnlyTransport }

/**
 * Fabrique de transport utilisée par la couche état.
 *
 * Phase 1 : transport strictement local (aucun réseau).
 * Phase 2 : renvoyer ici le transport RealtimeKit, par exemple
 *
 *   return createRealtimeKitTransport(options)
 *
 * sans modifier les composants, qui ne dépendent que de `MeetingTransport`.
 */
export function createTransport(options: MeetingTransportOptions): MeetingTransport {
  return new LocalOnlyTransport(options)
}
