import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { type PhotoGroup } from './scanner.js'

const RAW_EXTS = new Set(['.cr2', '.cr3', '.nef'])

export { getOrGenerateThumbnail as getThumbnail } from '../cache/thumbnailCache.js'

export async function getFullImage(photo: PhotoGroup): Promise<Buffer | NodeJS.ReadableStream | null> {
  const sourcePath = photo.jpgPath || photo.rawPaths[0]
  if (!sourcePath || !fs.existsSync(sourcePath)) return null

  const ext = path.extname(sourcePath).toLowerCase()
  if (RAW_EXTS.has(ext)) {
    try {
      return await sharp(sourcePath, { failOn: 'none' }).rotate().jpeg({ quality: 90 }).toBuffer()
    } catch {
      return null
    }
  }

  return fs.createReadStream(sourcePath)
}

export function getImageMimeType(photo: PhotoGroup): string {
  const sourcePath = photo.jpgPath || photo.rawPaths[0]
  if (!sourcePath) return 'image/jpeg'
  const ext = path.extname(sourcePath).toLowerCase()
  if (RAW_EXTS.has(ext)) return 'image/jpeg'
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  }
  return mimeMap[ext] || 'application/octet-stream'
}
