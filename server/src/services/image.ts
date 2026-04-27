import sharp from 'sharp'
import fs from 'fs'
import { type PhotoGroup } from './scanner.js'

const THUMBNAIL_SIZE = 200

// Simple in-memory thumbnail cache
const thumbCache = new Map<string, Buffer>()

export async function getThumbnail(photo: PhotoGroup): Promise<Buffer | null> {
  const sourcePath = photo.jpgPath || photo.rawPaths[0]
  if (!sourcePath) return null

  const cached = thumbCache.get(photo.id)
  if (cached) return cached

  try {
    const buf = await sharp(sourcePath, { failOn: 'none' })
      .rotate()
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer()

    thumbCache.set(photo.id, buf)
    return buf
  } catch {
    return null
  }
}

export function getFullImageStream(photo: PhotoGroup): NodeJS.ReadableStream | null {
  const sourcePath = photo.jpgPath || photo.rawPaths[0]
  if (!sourcePath || !fs.existsSync(sourcePath)) return null

  if (photo.jpgPath) {
    return fs.createReadStream(sourcePath)
  }

  // For RAW files, we'd need a RAW converter.
  // For now return null - RAW preview can be added later with dcraw or similar.
  return null
}

export function getImageMimeType(photo: PhotoGroup): string {
  return 'image/jpeg'
}
