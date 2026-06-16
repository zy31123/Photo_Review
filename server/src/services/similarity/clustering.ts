// 聚类算法：Union-Find + 分组构建
// 依赖 hash.ts 的距离函数，但不依赖 DB 或 IO

import crypto from 'crypto'
import type { PhotoGroup } from '@photo-review/shared'
import { hammingDistance, histogramSimilarity } from './hash.js'

/** buildGroups 返回的分组（不含审阅状态，由编排层补充） */
export interface SimilarGroupRaw {
  id: string
  photos: PhotoGroup[]
  coverIndex: number
  avgDistance: number
}

// --- 类型 ---

export interface HashRecord {
  filePath: string
  dhash: string
  width: number
  height: number
  fileSize: number
  colorHist: string | null
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

// --- 相似度判定 ---

export function isSimilar(
  recA: HashRecord,
  recB: HashRecord,
  strictThreshold: number,
  relaxedThreshold: number,
): boolean {
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

// --- 分组构建 ---

export function buildGroups(
  photos: PhotoGroup[],
  photoHashMap: Map<string, HashRecord>,
  timeGap: number,
  strictThreshold: number,
  relaxedThreshold: number,
): SimilarGroupRaw[] {
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
  const groups: SimilarGroupRaw[] = []

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
