import { useCallback, useSyncExternalStore } from 'react'

import { mediaDevicesSupported } from '../lib/mediaErrors'
import type { MediaDeviceList } from '../types/meeting'
import {
  getDeviceSnapshot,
  refreshDevices,
  subscribeToDevices,
} from './deviceStore'

export interface MediaDevicesController {
  devices: MediaDeviceList
  supported: boolean
  refresh: () => Promise<void>
}

/**
 * Caméras et microphones disponibles, lus depuis le store externe
 * (`deviceStore`) : la liste reste synchronisée avec le navigateur, y compris
 * lorsqu'un périphérique est branché ou retiré pendant la réunion.
 */
export function useMediaDevices(): MediaDevicesController {
  const supported = mediaDevicesSupported()
  const devices = useSyncExternalStore(subscribeToDevices, getDeviceSnapshot, getDeviceSnapshot)

  const refresh = useCallback(async () => {
    await refreshDevices()
  }, [])

  return { devices, supported, refresh }
}