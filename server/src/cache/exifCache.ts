import { type ExifData } from '../services/exif.js'
import { createLRUCache } from './lruCache.js'

const cache = createLRUCache<ExifData>(200)

export function getCachedExif(photoId: string): ExifData | null {
  return cache.get(photoId) ?? null
}

export function setCachedExif(photoId: string, data: ExifData): void {
  cache.set(photoId, data)
}
