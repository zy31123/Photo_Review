import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { type PhotoGroup } from '../services/scanner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = path.join(__dirname, '..', '..', 'data', 'thumbnails')
const THUMBNAIL_SIZE = 400
const MAX_MEMORY_CACHE = 500
const MAX_DISK_CACHE_MB = 500

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
}

// Memory LRU cache
const memoryCache = new Map<string, Buffer>()

function getDiskPath(photoId: string): string {
  return path.join(CACHE_DIR, `${photoId}.jpg`)
}

function evictMemoryCache(): void {
  if (memoryCache.size > MAX_MEMORY_CACHE) {
    const oldest = memoryCache.keys().next().value
    if (oldest !== undefined) memoryCache.delete(oldest)
  }
}

function cleanupDiskCache(): void {
  try {
    const entries = fs.readdirSync(CACHE_DIR)
      .map(name => ({
        name,
        path: path.join(CACHE_DIR, name),
        atime: fs.statSync(path.join(CACHE_DIR, name)).atimeMs,
      }))
      .sort((a, b) => a.atime - b.atime)

    let totalSize = 0
    for (const e of entries) {
      totalSize += fs.statSync(e.path).size
    }

    const maxBytes = MAX_DISK_CACHE_MB * 1024 * 1024
    let i = 0
    while (totalSize > maxBytes && i < entries.length) {
      const stat = fs.statSync(entries[i].path)
      fs.unlinkSync(entries[i].path)
      totalSize -= stat.size
      i++
    }
  } catch {
    // Silently ignore cleanup failures
  }
}

export async function getOrGenerateThumbnail(photo: PhotoGroup): Promise<Buffer | null> {
  const sourcePath = photo.jpgPath || photo.rawPaths[0]
  if (!sourcePath) return null

  // Layer 1: Memory cache
  const cached = memoryCache.get(photo.id)
  if (cached) {
    // LRU: move to end
    memoryCache.delete(photo.id)
    memoryCache.set(photo.id, cached)
    return cached
  }

  // Layer 2: Disk cache
  const diskPath = getDiskPath(photo.id)
  try {
    const diskBuf = fs.readFileSync(diskPath)
    memoryCache.set(photo.id, diskBuf)
    evictMemoryCache()
    return diskBuf
  } catch {
    // Not on disk, generate below
  }

  // Layer 3: Generate with sharp
  try {
    const buf = await sharp(sourcePath, { failOn: 'none' })
      .rotate()
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer()

    // Write to disk (fire-and-forget)
    try {
      fs.writeFileSync(diskPath, buf)
    } catch {
      // Disk write failure is non-critical
    }

    memoryCache.set(photo.id, buf)
    evictMemoryCache()

    return buf
  } catch {
    return null
  }
}

// Call disk cleanup once at startup
cleanupDiskCache()
