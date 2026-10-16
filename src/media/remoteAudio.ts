/**
 * Sélection des pistes audio **distantes** à restituer localement.
 *
 * Le SDK RealtimeKit ne rattache jamais une piste audio à un élément : il gère
 * la vidéo (`registerVideoElement`) mais laisse la restitution du son à
 * l'intégrateur. Cette fonction décrit donc, sans dépendre du SDK ni du DOM, ce
 * qu'il faut réellement jouer pour un participant distant.
 */

/** Vue minimale d'un participant dont dépend la restitution audio. */
export interface RemoteAudioSource {
  /** Micro du participant publié côté serveur. */
  audioEnabled: boolean
  /** Piste du micro, absente tant qu'aucun média n'est reçu. */
  audioTrack?: MediaStreamTrack | null
  /** Partage d'écran en cours chez ce participant. */
  screenShareEnabled?: boolean
  /** Pistes du partage d'écran : la piste audio n'existe pas toujours. */
  screenShareTracks?: { audio?: MediaStreamTrack | null } | null
}

/**
 * Pistes à jouer pour un participant distant.
 *
 * - La voix n'est restituée que si le micro est actif et que la piste est reçue.
 * - Le son du partage d'écran s'ajoute à la voix : partager un écran ne coupe
 *   pas la parole.
 * - Une même piste n'est jamais renvoyée deux fois : aucun son n'est joué en
 *   double.
 */
export function remoteAudioTracks(participant: RemoteAudioSource): MediaStreamTrack[] {
  const candidates: (MediaStreamTrack | null | undefined)[] = [
    participant.audioEnabled ? participant.audioTrack : null,
    participant.screenShareEnabled ? participant.screenShareTracks?.audio : null,
  ]

  const tracks: MediaStreamTrack[] = []
  for (const candidate of candidates) {
    if (candidate && !tracks.some((track) => track.id === candidate.id)) tracks.push(candidate)
  }

  return tracks
}
