import type { PhotoGroup } from '../api'

// Lightweight pub/sub for cross-component photo restore notifications.
// AppContext emits after successful undo-restore; page contexts listen to update local state.

type RestorePayload = { photoId: string; photo: PhotoGroup }
type BatchRestorePayload = { photos: PhotoGroup[] }

type EventMap = {
  'photo:restored': RestorePayload
  'photos:restored-batch': BatchRestorePayload
}

type Listener<T> = (data: T) => void

const listeners = new Map<string, Set<Listener<any>>>()

export const photoEvents = {
  on<K extends keyof EventMap>(event: K, fn: Listener<EventMap[K]>) {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event)!.add(fn)
  },

  off<K extends keyof EventMap>(event: K, fn: Listener<EventMap[K]>) {
    listeners.get(event)?.delete(fn)
  },

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    listeners.get(event)?.forEach(fn => fn(data))
  },
}
