import trash from 'trash'
import fs from 'fs'
import path from 'path'
import { type PhotoGroup } from './scanner.js'

export async function deletePhoto(photo: PhotoGroup): Promise<string[]> {
  const deleted: string[] = []

  const paths = [
    photo.jpgPath,
    ...photo.rawPaths,
  ].filter(Boolean) as string[]

  for (const p of paths) {
    if (fs.existsSync(p)) {
      await trash(p)
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
        await trash(p)
        count++
      }
    }
  }
  return count
}
