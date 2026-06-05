import { type ExifData } from '../services/exif.js'

const MAX_CACHE = 200
const cache = new Map<string, ExifData>()

export function getCachedExif(photoId: string): ExifData | null {
  const cached = cache.get(photoId)
  if (cached) {
    // LRU: move to end
    cache.delete(photoId)
    cache.set(photoId, cached)
    return cached
  }
  return null
}

export function setCachedExif(photoId: string, data: ExifData): void {
  cache.set(photoId, data)
  if (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}
