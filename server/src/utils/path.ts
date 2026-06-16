import path from 'path'
import type { PhotoGroup } from '@photo-review/shared'

export function normalizePath(p: string): string {
  return p.replaceAll('\\', '/')
}

export function resolveNormalized(p: string): string {
  return normalizePath(path.resolve(p))
}

/** Returns the primary display path for a photo group (JPG preferred, fallback to first RAW). */
export function getPrimaryPath(photo: PhotoGroup): string | null {
  return photo.jpgPath || photo.rawPaths[0] || null
}
