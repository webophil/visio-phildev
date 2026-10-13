import { mediaDevicesSupported } from '../lib/mediaErrors'
import type { MediaDeviceList, MediaDeviceOption, MediaKind } from '../types/meeting'
import { EMPTY_DEVICE_LIST } from '../types/meeting'

/**
 * Store externe des périphériques disponibles.
 *
 * La liste appartient au navigateur, pas à React : elle est donc exposée via
 * `useSyncExternalStore` plutôt que recopiée dans un état local alimenté par un
 * effet. Un unique abonnement `devicechange` est partagé par toute
 * l'application, et le premier abonnement déclenche l'énumération initiale.
 */

let snapshot: MediaDeviceList = EMPTY_DEVICE_LIST
const listeners = new Set<() => void>()
let listening = false
let inFlight: Promise<void> | null = null

function toOptions(infos: MediaDeviceInfo[], kind: MediaKind): MediaDeviceOption[] {
  const expectedKind = kind === 'audio' ? 'audioinput' : 'videoinput'
  const fallbackLabel = kind === 'audio' ? 'Microphone' : 'Caméra'

  return infos
    .filter((info) => info.kind === expectedKind)
    .map((info, index) => ({
      deviceId: info.deviceId,
      // Les libellés restent vides tant que la permission n'a pas été accordée.
      label: info.label.trim() || `${fallbackLabel} ${index + 1}`,
    }))
    .sort((a, b) => Number(b.deviceId === 'default') - Number(a.deviceId === 'default'))
}

function signature(list: MediaDeviceList): string {
  const describe = (options: MediaDeviceOption[]) =>
    options.map((option) => `${option.deviceId}:${option.label}`).join('|')

  return `${describe(list.audioInputs)}#${describe(list.videoInputs)}`
}

function publish(next: MediaDeviceList): void {
  // L'instantané n'est remplacé que s'il a réellement changé : les composants
  // abonnés ne sont pas re-rendus inutilement.
  if (signature(next) === signature(snapshot)) return

  snapshot = next
  for (const listener of listeners) listener()
}

/** Relit la liste des périphériques (libellés compris, après autorisation). */
export function refreshDevices(): Promise<void> {
  if (!mediaDevicesSupported()) {
    publish(EMPTY_DEVICE_LIST)
    return Promise.resolve()
  }

  if (inFlight) return inFlight

  inFlight = navigator.mediaDevices
    .enumerateDevices()
    .then((infos) => {
      publish({
        audioInputs: toOptions(infos, 'audio'),
        videoInputs: toOptions(infos, 'video'),
      })
    })
    .catch(() => {
      // L'énumération peut échouer dans un contexte non sécurisé : on conserve
      // la liste précédente sans interrompre l'utilisateur.
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

export function subscribeToDevices(listener: () => void): () => void {
  listeners.add(listener)

  if (!listening && mediaDevicesSupported()) {
    listening = true
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    void refreshDevices()
  }

  return () => {
    listeners.delete(listener)

    if (listening && listeners.size === 0) {
      listening = false
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }
}

export function getDeviceSnapshot(): MediaDeviceList {
  return snapshot
}

function handleDeviceChange(): void {
  void refreshDevices()
}