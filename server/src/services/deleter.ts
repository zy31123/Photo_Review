import trash from 'trash'
import fs from 'fs'
import type { PhotoGroup } from '@photo-review/shared'

async function safeDelete(filePath: string): Promise<boolean> {
  try {
    await trash(filePath)
    return true
  } catch {
    try {
      fs.unlinkSync(filePath)
      return true
    } catch {
      return false
    }
  }
}

export async function deletePhoto(photo: PhotoGroup): Promise<string[]> {
  const deleted: string[] = []

  const paths = [
    photo.jpgPath,
    ...photo.rawPaths,
  ].filter(Boolean) as string[]

  for (const p of paths) {
    if (fs.existsSync(p)) {
      if (await safeDelete(p)) deleted.push(p)
    }
  }

  return deleted
}

export async function deleteOrphanedFiles(photos: PhotoGroup[], type: 'jpg' | 'raw'): Promise<{ deleted: number; failed: number }> {
  let deleted = 0
  let failed = 0
  for (const photo of photos) {
    const paths = type === 'jpg' && photo.jpgPath
      ? [photo.jpgPath]
      : photo.rawPaths

    for (const p of paths) {
      if (fs.existsSync(p)) {
        if (await safeDelete(p)) deleted++
        else failed++
      }
    }
  }
  return { deleted, failed }
}
