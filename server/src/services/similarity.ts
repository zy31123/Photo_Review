import fs from 'fs'
import sharp from 'sharp'
import crypto from 'crypto'
import { getDb } from '../db/index.js'
import { getPhotosForFolder, type PhotoGroup } from './scanner.js'

export interface SimilarGroup {
  id: string
  photos: PhotoGroup[]
  coverIndex: number
  avgDistance: number
}

export interface AnalyzeResult {
  computed: number
  skipped: number
  totalGroups: number
  totalPhotos: number
}

interface HashRecord {
  filePath: string
  dhash: string
  width: number
  height: number
  fileSize: number
}

// --- dHash computation ---

async function computeDHash(imagePath: string): Promise<{ hash: string; width: number; height: number; fileSize: number }> {
  // Get original image metadata (before resize)
  const stat = await fs.promises.stat(imagePath)
  const metadata = await sharp(imagePath, { failOn: 'none' }).metadata()
  const { data, info } = await sharp(imagePath, { failOn: 'none' })
    .resize(9, 8, { fit: 'cover' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // dHash: compare adjacent horizontal pixels in each row
  // 9 columns, 8 rows → 8 comparisons per row → 64 bits
  let hash = BigInt(0)
  let bit = BigInt(0)
  for (let row = 0; row < info.height; row++) {
    for (let col = 0; col < info.width - 1; col++) {
      const left = data[row * info.width + col]
      const right = data[row * info.width + col + 1]
      if (left > right) {
        hash |= BigInt(1) << bit
      }
      bit++
    }
  }

  return {
    hash: hash.toString(16).padStart(16, '0'),
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    fileSize: stat.size,
  }
}

// --- Hamming distance ---

function hammingDistance(a: string, b: string): number {
  const bigA = BigInt('0x' + a)
  const bigB = BigInt('0x' + b)
  let xor = bigA ^ bigB
  let count = 0
  while (xor) {
    count += Number(xor & BigInt(1))
    xor >>= BigInt(1)
  }
  return count
}

// --- Query hashes for a folder's photos ---

const getHashesStmt = () =>
  getDb().prepare('SELECT file_path, dhash, width, height, file_size FROM photo_hashes WHERE file_path = ?')

function loadHashesForPhotos(photos: PhotoGroup[]): Map<string, HashRecord> {
  const stmt = getHashesStmt()
  const result = new Map<string, HashRecord>()
  for (const photo of photos) {
    const filePath = photo.jpgPath || photo.rawPaths[0]
    if (!filePath) continue
    const row = stmt.get(filePath) as HashRecord | undefined
    if (row) result.set(photo.id, row)
  }
  return result
}

// --- Union-Find ---

class UnionFind {
  parent: Map<string, string>
  rank: Map<string, number>

  constructor(ids: string[]) {
    this.parent = new Map(ids.map(id => [id, id]))
    this.rank = new Map(ids.map(id => [id, 0]))
  }

  find(x: string): string {
    let root = x
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!
    }
    // Path compression
    let current = x
    while (current !== root) {
      const next = this.parent.get(current)!
      this.parent.set(current, root)
      current = next
    }
    return root
  }

  union(a: string, b: string): void {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA === rootB) return
    const rankA = this.rank.get(rootA)!
    const rankB = this.rank.get(rootB)!
    if (rankA < rankB) {
      this.parent.set(rootA, rootB)
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA)
    } else {
      this.parent.set(rootB, rootA)
      this.rank.set(rootA, rankA + 1)
    }
  }
}

// --- Main functions ---

export async function analyzeFolder(
  folder: string,
  timeGap = 30,
  hashThreshold = 10,
): Promise<AnalyzeResult> {
  const photos = getPhotosForFolder(folder)
  const db = getDb()

  // 1. Load existing hashes for this folder's photos only
  const existingHashes = loadHashesForPhotos(photos)

  // 2. Compute hashes for photos that don't have one yet
  const insertStmt = db.prepare(
    'INSERT OR REPLACE INTO photo_hashes (file_path, dhash, width, height, file_size) VALUES (?, ?, ?, ?, ?)'
  )
  let computed = 0
  let skipped = 0

  const photoHashMap = new Map<string, HashRecord>()

  for (const photo of photos) {
    const filePath = photo.jpgPath || photo.rawPaths[0]
    if (!filePath) continue

    const existing = existingHashes.get(photo.id)
    if (existing) {
      photoHashMap.set(photo.id, existing)
      skipped++
    } else {
      try {
        const result = await computeDHash(filePath)
        const record: HashRecord = {
          filePath,
          dhash: result.hash,
          width: result.width,
          height: result.height,
          fileSize: result.fileSize,
        }
        insertStmt.run(filePath, result.hash, result.width, result.height, result.fileSize)
        photoHashMap.set(photo.id, record)
        computed++
      } catch {
        // Skip photos that fail to process
      }
    }
  }

  // 3. Build similar groups
  const groups = buildGroups(photos, photoHashMap, timeGap, hashThreshold)

  return {
    computed,
    skipped,
    totalGroups: groups.length,
    totalPhotos: groups.reduce((sum, g) => sum + g.photos.length, 0),
  }
}

export function getSimilarGroups(
  folder: string,
  timeGap = 30,
  hashThreshold = 10,
): SimilarGroup[] {
  const photos = getPhotosForFolder(folder)
  const photoHashMap = loadHashesForPhotos(photos)
  return buildGroups(photos, photoHashMap, timeGap, hashThreshold)
}

function buildGroups(
  photos: PhotoGroup[],
  photoHashMap: Map<string, HashRecord>,
  timeGap: number,
  hashThreshold: number,
): SimilarGroup[] {
  // Filter to photos with hashes and valid dates
  const candidates = photos.filter(p => {
    if (!photoHashMap.has(p.id) || !p.date) return false
    return true
  })

  if (candidates.length < 2) return []

  // Sort by date
  candidates.sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  // Phase 1: Time-based pre-grouping
  const sessions: PhotoGroup[][] = []
  let currentSession: PhotoGroup[] = [candidates[0]]

  for (let i = 1; i < candidates.length; i++) {
    const prevDate = new Date(candidates[i - 1].date!).getTime()
    const currDate = new Date(candidates[i].date!).getTime()
    if (currDate - prevDate <= timeGap * 1000) {
      currentSession.push(candidates[i])
    } else {
      if (currentSession.length >= 2) sessions.push(currentSession)
      currentSession = [candidates[i]]
    }
  }
  if (currentSession.length >= 2) sessions.push(currentSession)

  // Phase 2: Hash-based clustering within each session
  const groups: SimilarGroup[] = []

  for (const session of sessions) {
    if (session.length < 2) continue

    const ids = session.map(p => p.id)
    const uf = new UnionFind(ids)

    for (let i = 0; i < session.length; i++) {
      const hashA = photoHashMap.get(session[i].id)!.dhash
      for (let j = i + 1; j < session.length; j++) {
        const hashB = photoHashMap.get(session[j].id)!.dhash
        const dist = hammingDistance(hashA, hashB)
        if (dist <= hashThreshold) {
          uf.union(session[i].id, session[j].id)
        }
      }
    }

    // Collect connected components
    const componentMap = new Map<string, PhotoGroup[]>()
    for (const photo of session) {
      const root = uf.find(photo.id)
      if (!componentMap.has(root)) componentMap.set(root, [])
      componentMap.get(root)!.push(photo)
    }

    for (const component of componentMap.values()) {
      if (component.length < 2) continue

      // Compute average distance within this group
      let groupDist = 0
      let groupPairs = 0
      for (let i = 0; i < component.length; i++) {
        const hA = photoHashMap.get(component[i].id)!.dhash
        for (let j = i + 1; j < component.length; j++) {
          const hB = photoHashMap.get(component[j].id)!.dhash
          groupDist += hammingDistance(hA, hB)
          groupPairs++
        }
      }

      // Find recommended keep: largest file size → highest resolution → deterministic
      let bestIdx = 0
      let bestScore = -1
      component.forEach((photo, idx) => {
        const record = photoHashMap.get(photo.id)!
        const score = record.fileSize * 10000 + record.width * record.height
        if (score > bestScore) {
          bestScore = score
          bestIdx = idx
        }
      })

      const idSource = component.map(p => p.id).sort().join('|')
      groups.push({
        id: crypto.createHash('md5').update(idSource).digest('hex').slice(0, 12),
        photos: component,
        coverIndex: bestIdx,
        avgDistance: groupPairs > 0 ? Math.round((groupDist / groupPairs) * 10) / 10 : 0,
      })
    }
  }

  // Sort by group size descending, then by avg distance ascending
  groups.sort((a, b) => b.photos.length - a.photos.length || a.avgDistance - b.avgDistance)

  return groups
}

export function getSimilarStats(folder: string): { analyzed: number; total: number; groups: number } {
  const photos = getPhotosForFolder(folder)
  const photoHashMap = loadHashesForPhotos(photos)
  const groups = getSimilarGroups(folder)

  return { analyzed: photoHashMap.size, total: photos.length, groups: groups.length }
}
