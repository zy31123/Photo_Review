import trash from 'trash'
import fs from 'fs'
import { type PhotoGroup } from './scanner.js'

async function safeDelete(filePath: string) {
  try {
    await trash(filePath)
  } catch {
    fs.unlinkSync(filePath)
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
      await safeDelete(p)
      deleted.push(p)
    }
  }

  return deleted
}

export async function deleteOrphanedFiles(photos: PhotoGroup[], type: 'jpg' | 'raw'): Promise<number> {
  let count = 0
  for (const photo of photos) {
    const paths = type === 'jpg' && photo.jpgPath
      ? [photo.jpgPath]
      : photo.rawPaths

    for (const p of paths) {
      if (fs.existsSync(p)) {
        await safeDelete(p)
        count++
      }
    }
  }
  return count
}
