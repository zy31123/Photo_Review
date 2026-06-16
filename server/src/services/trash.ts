import fs from 'fs'
import path from 'path'
import os from 'os'
import type { PhotoGroup } from '@photo-review/shared'

const TRASH_DIR = path.join(os.tmpdir(), '.photoreview-trash')

function ensureTrashDir(): void {
  if (!fs.existsSync(TRASH_DIR)) {
    fs.mkdirSync(TRASH_DIR, { recursive: true })
  }
}

function moveFile(src: string, dest: string): void {
  const destDir = path.dirname(dest)
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }
  try {
    fs.renameSync(src, dest)
  } catch {
    // Cross-device: copy then unlink
    fs.copyFileSync(src, dest)
    fs.unlinkSync(src)
  }
}

export interface TrashResult {
  trashPaths: Record<string, string>  // originalPath → trashPath
  failed: string[]
}

export function moveToTrash(photo: PhotoGroup): TrashResult {
  ensureTrashDir()
  const trashPaths: Record<string, string> = {}
  const failed: string[] = []

  const paths = [photo.jpgPath, ...photo.rawPaths].filter(Boolean) as string[]
  const photoTrashDir = path.join(TRASH_DIR, photo.id)

  for (const p of paths) {
    if (!fs.existsSync(p)) {
      failed.push(p)
      continue
    }
    const dest = path.join(photoTrashDir, path.basename(p))
    try {
      moveFile(p, dest)
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

export function restoreFromTrash(photoId: string, trashPaths: Record<string, string>): RestoreResult {
  const restored: string[] = []
  const failed: string[] = []

  for (const [originalPath, trashPath] of Object.entries(trashPaths)) {
    if (!fs.existsSync(trashPath)) {
      failed.push(originalPath)
      continue
    }
    const destDir = path.dirname(originalPath)
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }
    try {
      moveFile(trashPath, originalPath)
      restored.push(originalPath)
    } catch {
      failed.push(originalPath)
    }
  }

  // Clean up trash subdirectory
  const photoTrashDir = path.join(TRASH_DIR, photoId)
  if (fs.existsSync(photoTrashDir)) {
    try {
      fs.rmSync(photoTrashDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup failure
    }
  }

  return { restored, failed }
}
