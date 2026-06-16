import fs from 'fs'
import path from 'path'
import os from 'os'
import type { PhotoGroup } from '@photo-review/shared'

const TRASH_DIR = path.join(os.tmpdir(), '.photoreview-trash')

async function ensureTrashDir(): Promise<void> {
  await fs.promises.mkdir(TRASH_DIR, { recursive: true })
}

async function moveFile(src: string, dest: string): Promise<void> {
  const destDir = path.dirname(dest)
  await fs.promises.mkdir(destDir, { recursive: true })
  try {
    await fs.promises.rename(src, dest)
  } catch {
    // Cross-device: copy then unlink
    await fs.promises.copyFile(src, dest)
    await fs.promises.unlink(src)
  }
}

export interface TrashResult {
  trashPaths: Record<string, string>  // originalPath → trashPath
  failed: string[]
}

export async function moveToTrash(photo: PhotoGroup): Promise<TrashResult> {
  await ensureTrashDir()
  const trashPaths: Record<string, string> = {}
  const failed: string[] = []

  const paths = [photo.jpgPath, ...photo.rawPaths].filter(Boolean) as string[]
  const photoTrashDir = path.join(TRASH_DIR, photo.id)

  for (const p of paths) {
    const dest = path.join(photoTrashDir, path.basename(p))
    try {
      await moveFile(p, dest)
      trashPaths[p] = dest
    } catch {
      failed.push(p)
    }
  }

  return { trashPaths, failed }
}

export interface RestoreResult {
  restored: string[]
  failed: string[]
}

export async function restoreFromTrash(photoId: string, trashPaths: Record<string, string>): Promise<RestoreResult> {
  const restored: string[] = []
  const failed: string[] = []

  for (const [originalPath, trashPath] of Object.entries(trashPaths)) {
    const destDir = path.dirname(originalPath)
    try {
      await fs.promises.mkdir(destDir, { recursive: true })
      await moveFile(trashPath, originalPath)
      restored.push(originalPath)
    } catch {
      failed.push(originalPath)
    }
  }

  // Clean up trash subdirectory only when all files were restored successfully.
  // If some files failed, keep the trash dir so the user can retry.
  if (failed.length === 0) {
    const photoTrashDir = path.join(TRASH_DIR, photoId)
    try {
      await fs.promises.rm(photoTrashDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup failure
    }
  }

  return { restored, failed }
}
