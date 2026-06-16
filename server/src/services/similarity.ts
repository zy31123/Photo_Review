import fs from 'fs'
import sharp from 'sharp'
import crypto from 'crypto'
import pLimit from 'p-limit'
import { getDb } from '../db/index.js'
import type { PhotoGroup, SimilarGroup, AnalyzeResult } from '@photo-review/shared'
import { getPhotosForFolder } from './photoStore.js'
import { getPrimaryPath } from '../utils/path.js'

interface HashRecord {
  filePath: string
  dhash: string
  width: number
  height: number
  fileSize: number
  colorHist: string | null
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

// --- Color histogram ---

const HIST_BINS = 16
const HIST_CHANNELS = 3 // RGB
const HIST_SIZE = HIST_BINS * HIST_CHANNELS // 48 values

async function computeColorHistogram(imagePath: string): Promise<string> {
  const { data, info } = await sharp(imagePath, { failOn: 'none' })
    .resize(64, 64, { fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const bins = new Float32Array(HIST_SIZE)
  const pixelCount = info.width * info.height

  for (let i = 0; i < pixelCount; i++) {
    const r = data[i * 3]
    const g = data[i * 3 + 1]
    const b = data[i * 3 + 2]
    bins[Math.floor(r / (256 / HIST_BINS))] += 1
    bins[HIST_BINS + Math.floor(g / (256 / HIST_BINS))] += 1
    bins[HIST_BINS * 2 + Math.floor(b / (256 / HIST_BINS))] += 1
  }

  // Normalize per channel
  for (let c = 0; c < HIST_CHANNELS; c++) {
    let sum = 0
    for (let i = 0; i < HIST_BINS; i++) sum += bins[c * HIST_BINS + i]
    if (sum > 0) {
      for (let i = 0; i < HIST_BINS; i++) bins[c * HIST_BINS + i] /= sum
    }
  }

  // Compact: quantize to 0–255 range for compact storage
  const quantized = new Uint8Array(HIST_SIZE)
  for (let i = 0; i < HIST_SIZE; i++) {
    quantized[i] = Math.round(bins[i] * 255)
  }

  return Buffer.from(quantized).toString('base64')
}

function histogramSimilarity(a: string, b: string): number {
  const binsA = new Float32Array(HIST_SIZE)
  const binsB = new Float32Array(HIST_SIZE)
  const bufA = Buffer.from(a, 'base64')
  const bufB = Buffer.from(b, 'base64')
  for (let i = 0; i < HIST_SIZE; i++) {
    binsA[i] = bufA[i] / 255
    binsB[i] = bufB[i] / 255
  }

  // Histogram intersection (sum of min values, already normalized)
  let intersection = 0
  for (let i = 0; i < HIST_SIZE; i++) {
    intersection += Math.min(binsA[i], binsB[i])
  }
  return intersection / HIST_CHANNELS // 0–1 per channel average
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

// --- Dual-threshold similarity check ---

function isSimilar(recA: HashRecord, recB: HashRecord, strictThreshold: number, relaxedThreshold: number): boolean {
  const dist = hammingDistance(recA.dhash, recB.dhash)

  // Strict: hash distance low enough → similar
  if (dist <= strictThreshold) return true

  // Beyond relaxed threshold → not similar
  if (dist > relaxedThreshold) return false

  // Relaxed: require metadata OR color histogram corroboration
  // 1. Color histogram similarity (if available)
  if (recA.colorHist && recB.colorHist) {
    const histSim = histogramSimilarity(recA.colorHist, recB.colorHist)
    if (histSim >= 0.85) return true
  }

  // 2. Dimensions within 5%
  if (recA.width > 0 && recB.width > 0 && recA.height > 0 && recB.height > 0) {
    const widthRatio = Math.min(recA.width, recB.width) / Math.max(recA.width, recB.width)
    const heightRatio = Math.min(recA.height, recB.height) / Math.max(recA.height, recB.height)
    if (widthRatio < 0.95 || heightRatio < 0.95) return false
  }
  // 3. File size within 50%
  const sizeRatio = Math.min(recA.fileSize, recB.fileSize) / Math.max(recA.fileSize, recB.fileSize)
  return sizeRatio >= 0.5
}

// --- Query hashes for a folder's photos ---

const getHashesStmt = () =>
  getDb().prepare('SELECT file_path, dhash, width, height, file_size, color_hist FROM photo_hashes WHERE file_path = ?')

function loadHashesForPhotos(photos: PhotoGroup[]): Map<string, HashRecord> {
  const stmt = getHashesStmt()
  const result = new Map<string, HashRecord>()
  for (const photo of photos) {
    const filePath = getPrimaryPath(photo)
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
  strictThreshold = 8,
  relaxedThreshold = 15,
  onProgress?: (current: number, total: number) => void,
): Promise<AnalyzeResult> {
  const photos = getPhotosForFolder(folder)
  const db = getDb()

  // 1. Load existing hashes for this folder's photos only
  const existingHashes = loadHashesForPhotos(photos)

  // 2. Compute hashes for photos that don't have one yet — parallel with p-limit
  const insertStmt = db.prepare(
    'INSERT OR REPLACE INTO photo_hashes (file_path, dhash, width, height, file_size, color_hist) VALUES (?, ?, ?, ?, ?, ?)'
  )
  let computed = 0
  let skipped = 0

  const total = photos.length
  let processed = 0
  const photoHashMap = new Map<string, HashRecord>()

  const limit = pLimit(4)

  await Promise.all(photos.map(photo => limit(async () => {
    const filePath = getPrimaryPath(photo)
    if (!filePath) return

    const existing = existingHashes.get(photo.id)
    if (existing) {
      // Backfill color histogram for records that lack one
      if (!existing.colorHist) {
        try {
          const hist = await computeColorHistogram(filePath)
          existing.colorHist = hist
          db.prepare('UPDATE photo_hashes SET color_hist = ? WHERE file_path = ?').run(hist, filePath)
        } catch {
          // Keep existing record without histogram
        }
      }
      photoHashMap.set(photo.id, existing)
      skipped++
    } else {
      try {
        const [dhashResult, colorHist] = await Promise.all([
          computeDHash(filePath),
          computeColorHistogram(filePath),
        ])
        const record: HashRecord = {
          filePath,
          dhash: dhashResult.hash,
          width: dhashResult.width,
          height: dhashResult.height,
          fileSize: dhashResult.fileSize,
          colorHist,
        }
        insertStmt.run(filePath, dhashResult.hash, dhashResult.width, dhashResult.height, dhashResult.fileSize, colorHist)
        photoHashMap.set(photo.id, record)
        computed++
      } catch {
        // Skip photos that fail to process
      }
    }
    processed++
    onProgress?.(processed, total)
  })))

  // 3. Build similar groups
  const groups = buildGroups(photos, photoHashMap, timeGap, strictThreshold, relaxedThreshold)

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
  strictThreshold = 8,
  relaxedThreshold = 15,
): SimilarGroup[] {
  const photos = getPhotosForFolder(folder)
  const photoHashMap = loadHashesForPhotos(photos)
  return buildGroups(photos, photoHashMap, timeGap, strictThreshold, relaxedThreshold)
}

function buildGroups(
  photos: PhotoGroup[],
  photoHashMap: Map<string, HashRecord>,
  timeGap: number,
  strictThreshold: number,
  relaxedThreshold: number,
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
      const recA = photoHashMap.get(session[i].id)!
      for (let j = i + 1; j < session.length; j++) {
        const recB = photoHashMap.get(session[j].id)!
        if (isSimilar(recA, recB, strictThreshold, relaxedThreshold)) {
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
