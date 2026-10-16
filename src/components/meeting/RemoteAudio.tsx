import { useRealtimeKitMeeting, useRealtimeKitSelector } from '@cloudflare/realtimekit-react'
import { Volume2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { NOTICES } from '../../lib/notices'
import { remoteAudioTracks } from '../../media/remoteAudio'
import { Button } from '../ui/Button'
import { Notice } from '../ui/Notice'

/**
 * Sortie audio des participants distants.
 *
 * Le SDK rattache lui-même la **vidéo** aux éléments `<video>`
 * (`participant.registerVideoElement`), mais il ne fournit **aucune** sortie
 * pour l'**audio** : sa lecture interne n'existe que derrière l'option
 * expérimentale `modules.experimentalAudioPlayback`, désactivée par défaut. Sans
 * élément de lecture explicitement alimenté, les voix distantes sont donc reçues
 * puis restituées nulle part — c'est le rôle de ce composant, qui suit
 * exactement la recommandation de l'exemple officiel livré avec le paquet :
 * un `<audio>` par participant, `srcObject` construit à partir de
 * `participant.audioTrack`.
 *
 * Il est monté **une seule fois pour la salle**, jamais dans les vignettes : le
 * son ne dépend donc pas de la disposition affichée (grille, partage d'écran,
 * changement de panneau), et chaque voix n'a qu'une seule sortie.
 */
export function RemoteAudioSinks() {
  const { meeting } = useRealtimeKitMeeting()
  const remotes = useRealtimeKitSelector((client) => client.participants.joined.toArray())
  const [revision, setRevision] = useState(0)
  const [blocked, setBlocked] = useState(false)

  const elementsRef = useRef(new Map<string, HTMLAudioElement>())
  const participantKey = remotes.map((participant) => participant.id).join('|')

  // Les pistes distantes arrivent et repartent sans que React en soit informé :
  // chaque participant annonce ses changements média (micro arrivé, retiré,
  // remplacé, partage d'écran sonore), et toute piste annoncée relance la
  // liaison aux éléments de lecture.
  useEffect(() => {
    const notify = () => setRevision((current) => current + 1)
    const joined = meeting.participants.joined

    joined.on('*', notify)
    for (const participant of joined.toArray()) {
      participant.on('audioUpdate', notify)
      participant.on('screenShareUpdate', notify)
    }

    return () => {
      joined.removeListener('*', notify)
      for (const participant of joined.toArray()) {
        participant.removeListener('audioUpdate', notify)
        participant.removeListener('screenShareUpdate', notify)
      }
    }
  }, [meeting, participantKey])

  // Liaison d'une piste reçue à l'élément de lecture du participant concerné.
  useEffect(() => {
    for (const participant of remotes) {
      const element = elementsRef.current.get(participant.id)
      if (!element) continue

      const tracks = remoteAudioTracks(participant)
      const stream = tracks.length > 0 ? new MediaStream(tracks) : null
      const current = element.srcObject instanceof MediaStream ? element.srcObject : null

      if (!sameStream(current, stream)) element.srcObject = stream
      if (!stream) continue

      // `autoPlay` couvre le cas nominal ; l'appel explicite permet de détecter
      // un refus de lecture et de proposer un geste de reprise.
      void element.play().catch((error: unknown) => {
        if (isPlaybackRefused(error)) setBlocked(true)
      })
    }
  }, [remotes, revision])

  /** Nouvelle tentative de lecture, puis état réellement constaté. */
  const resume = useCallback(async () => {
    const elements = [...elementsRef.current.values()]
    await Promise.all(elements.map((element) => element.play().catch(() => undefined)))
    setBlocked(elements.some((element) => element.srcObject !== null && element.paused))
  }, [])

  // Un geste suffit à lever un blocage de lecture : la reprise est tentée dès le
  // premier clic ou la première touche, sans obliger à trouver le bouton.
  useEffect(() => {
    if (!blocked) return

    const retry = () => void resume()
    document.addEventListener('pointerdown', retry, { once: true })
    document.addEventListener('keydown', retry, { once: true })

    return () => {
      document.removeEventListener('pointerdown', retry)
      document.removeEventListener('keydown', retry)
    }
  }, [blocked, resume])

  return (
    <>
      <div aria-hidden="true" className="sr-only">
        {remotes.map((participant) => (
          <audio
            key={participant.id}
            autoPlay
            ref={(element) => {
              if (element) elementsRef.current.set(participant.id, element)
              else elementsRef.current.delete(participant.id)
            }}
          />
        ))}
      </div>

      {blocked ? (
        <Notice
          tone="warning"
          title="Le son des participants est bloqué par le navigateur"
          action={
            <Button variant="secondary" size="sm" onClick={() => void resume()}>
              <Volume2 aria-hidden="true" className="size-4" />
              Activer le son
            </Button>
          }
        >
          {NOTICES.audioPlayback}
        </Notice>
      ) : null}
    </>
  )
}

/** Refus de lecture automatique, à distinguer des autres erreurs de lecture. */
function isPlaybackRefused(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: string }).name === 'NotAllowedError'
  )
}

/** Deux flux sont équivalents si leurs pistes le sont, dans le même ordre. */
function sameStream(current: MediaStream | null, next: MediaStream | null): boolean {
  if (!current || !next) return current === next

  const currentTracks = current.getTracks()
  const nextTracks = next.getTracks()

  return (
    currentTracks.length === nextTracks.length &&
    currentTracks.every((track, index) => track.id === nextTracks[index]?.id)
  )
}
