import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { resolveNormalized, normalizePath } from '../utils/path.js'
import type { PhotoGroup, ScanResult } from '@photo-review/shared'
import { setFolderPhotos } from './photoStore.js'

const JPG_EXTS = new Set(['.jpg', '.jpeg'])
const RAW_EXTS = new Set(['.cr2', '.cr3', '.nef'])

export async function scanFolder(folderPath: string): Promise<ScanResult> {
  const normalized = resolveNormalized(folderPath)

  if (!fs.existsSync(normalized)) {
    throw new Error(`文件夹不存在: ${normalized}`)
  }

  const stat = await fs.promises.stat(normalized)
  if (!stat.isDirectory()) {
    throw new Error('路径不是一个文件夹')
  }

  const groups = new Map<string, { jpg: string[]; raw: string[]; dir: string }>()
  const visited = new Set<string>()

  const walkDir = async (dir: string) => {
    const realDir = await fs.promises.realpath(dir)
    if (visited.has(realDir)) return
    visited.add(realDir)
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = normalizePath(path.join(dir, entry.name))
      if (entry.isDirectory()) {
        await walkDir(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        const baseName = path.basename(entry.name, path.extname(entry.name))

        if (JPG_EXTS.has(ext) || RAW_EXTS.has(ext)) {
          const key = normalizePath(path.join(dir, baseName))
          if (!groups.has(key)) {
            groups.set(key, { jpg: [], raw: [], dir })
          }
          const group = groups.get(key)!
          if (JPG_EXTS.has(ext)) {
            group.jpg.push(fullPath)
          } else {
            group.raw.push(fullPath)
          }
        }
      }
    }
  }

  await walkDir(normalized)

  const photos: PhotoGroup[] = []
  let paired = 0
  let orphanJpg = 0
  let orphanRaw = 0

  for (const [key, group] of groups) {
    const hasJpg = group.jpg.length > 0
    const hasRaw = group.raw.length > 0
    const isOrphan = !hasJpg || !hasRaw
    let orphanType: 'jpg' | 'raw' | undefined
    if (isOrphan) {
      orphanType = hasJpg ? 'jpg' : 'raw'
    }

    let date: string | undefined
    try {
      const fileStat = await fs.promises.stat(group.jpg[0] || group.raw[0])
      date = fileStat.mtime.toISOString().slice(0, 10)
    } catch {}

    const relative = path.relative(normalized, group.dir) || '.'
    const photo: PhotoGroup = {
      id: crypto.createHash('md5').update(key).digest('hex'),
      name: path.basename(key) + (hasJpg ? '.JPG' : path.extname(group.raw[0]).toUpperCase()),
      jpgPath: hasJpg ? group.jpg[0] : null,
      rawPaths: group.raw,
      hasJpg,
      hasRaw,
      isOrphan,
      orphanType,
      date,
      folder: normalized,
      subfolder: normalizePath(relative),
    }

    photos.push(photo)
    if (isOrphan) {
      if (orphanType === 'jpg') orphanJpg++
      else orphanRaw++
    } else {
      paired++
    }
  }

  photos.sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  setFolderPhotos(normalized, photos)

  return { total: photos.length, paired, orphanJpg, orphanRaw }
}
