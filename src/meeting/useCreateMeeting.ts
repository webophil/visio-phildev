import { useCallback, useState } from 'react'

import { MEETING_LINK_PARAM, createMeetingId, meetingDisplayName } from '../lib/ids'
import { meetingPath } from '../lib/format'
import { navigate } from '../lib/router'
import { readHostSession } from './hostSession'
import { MeetingApiError, createMeeting } from './rtkApi'

export interface CreateMeetingController {
  busy: boolean
  error: string | null
  /**
   * Crée une réunion côté Cloudflare RealtimeKit, puis ouvre la salle.
   * Renvoie `false` lorsque la création a échoué ; le message est alors exposé
   * par `error`.
   */
  start: (options?: { displayName?: string; meetingId?: string }) => Promise<boolean>
  clearError: () => void
}

/**
 * Création d'une réunion.
 *
 * L'identifiant lisible (`rdv-xxxxxxx`) est choisi localement et sert de nom au
 * rendez-vous ; la réunion Cloudflare, elle, est créée côté serveur et son
 * identifiant est transporté par le lien (`?r=`). Créer une réunion exige une
 * session organisateur valide : l'API refuse toute autre demande.
 */
export function useCreateMeeting(): CreateMeetingController {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async (options?: { displayName?: string; meetingId?: string }) => {
    const session = readHostSession()

    if (!session) {
      setError("Connectez-vous en organisateur pour créer une réunion.")
      return false
    }

    setBusy(true)
    setError(null)

    try {
      // L'identifiant lisible est réutilisé lorsqu'il vient de l'URL (création
      // depuis une salle ouverte par un lien incomplet).
      const meetingId = options?.meetingId ?? createMeetingId()
      const displayName = options?.displayName?.trim() || 'Organisateur'
      const created = await createMeeting({
        title: meetingDisplayName(meetingId),
        displayName,
        hostToken: session.token,
      })

      const link = `${meetingPath(meetingId)}?${MEETING_LINK_PARAM}=${encodeURIComponent(created.meetingId)}`
      navigate(link)
      return true
    } catch (failure) {
      setError(
        failure instanceof MeetingApiError
          ? failure.message
          : "La création de la réunion a échoué. Réessayez dans quelques instants.",
      )
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { busy, error, start, clearError }
}
