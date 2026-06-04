import { createContext, useContext, useState, useMemo, useCallback, useRef, type ReactNode } from 'react'
import { useApp } from './AppContext'
import { api, type SimilarGroup, type AnalyzeResult, type SimilarStats, type AnalyzeProgress } from '../api'

type SelectionState = 'keep' | 'delete' | null

interface SimilarContextType {
  status: 'idle' | 'analyzing' | 'done'
  result: AnalyzeResult | null
  stats: SimilarStats | null
  progress: AnalyzeProgress | null
  groups: SimilarGroup[]
  selections: Map<string, Map<string, SelectionState>>
  analyze: () => Promise<void>
  abortAnalyze: () => void
  refreshStats: () => Promise<void>
  toggleSelection: (groupId: string, photoId: string) => void
  keepRecommended: (groupId: string) => void
  deleteAllExceptRecommended: (groupId: string) => void
  deleteSelected: () => Promise<number>
  selectedDeleteCount: number
}

const SimilarCtx = createContext<SimilarContextType | null>(null)

export function useSimilar() {
  const ctx = useContext(SimilarCtx)
  if (!ctx) throw new Error('useSimilar must be used within SimilarProvider')
  return ctx
}

export function SimilarProvider({ children }: { children: ReactNode }) {
  const { activeFolder } = useApp()

  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done'>('idle')
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [stats, setStats] = useState<SimilarStats | null>(null)
  const [groups, setGroups] = useState<SimilarGroup[]>([])
  const [selections, setSelections] = useState<Map<string, Map<string, SelectionState>>>(new Map())
  const [progress, setProgress] = useState<AnalyzeProgress | null>(null)
  const abortRef = useRef<(() => void) | null>(null)

  const refreshStats = useCallback(async () => {
    if (!activeFolder) return
    try {
      const s = await api.getSimilarStats()
      setStats(s)
    } catch {
      // ignore
    }
  }, [activeFolder])

  const analyze = useCallback(async () => {
    if (!activeFolder) return
    setStatus('analyzing')
    setProgress(null)
    try {
      const r = await new Promise<AnalyzeResult>((resolve, reject) => {
        abortRef.current = api.analyzeSimilarStream(
          {
            onProgress: (p) => setProgress(p),
            onComplete: (result) => resolve(result),
            onError: (msg) => reject(new Error(msg)),
          },
        )
      })
      setResult(r)
      const { groups: g } = await api.getSimilarGroups({ limit: 200 })
      setGroups(g)
      // Initialize selections: recommended photo = 'keep', others = null
      const newSelections = new Map<string, Map<string, SelectionState>>()
      for (const group of g) {
        const groupSel = new Map<string, SelectionState>()
        for (let i = 0; i < group.photos.length; i++) {
          groupSel.set(group.photos[i].id, i === group.coverIndex ? 'keep' : null)
        }
        newSelections.set(group.id, groupSel)
      }
      setSelections(newSelections)
      setProgress(null)
      setStatus('done')
    } catch {
      setProgress(null)
      setStatus('idle')
    }
  }, [activeFolder])

  const abortAnalyze = useCallback(() => {
    abortRef.current?.()
    abortRef.current = null
    setProgress(null)
    setStatus('idle')
  }, [])

  const toggleSelection = useCallback((groupId: string, photoId: string) => {
    setSelections(prev => {
      const next = new Map(prev)
      const groupSel = new Map(next.get(groupId) || new Map())
      const current = groupSel.get(photoId)
      groupSel.set(photoId, current === 'delete' ? null : 'delete')
      next.set(groupId, groupSel)
      return next
    })
  }, [])

  const keepRecommended = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    if (!group) return
    setSelections(prev => {
      const next = new Map(prev)
      const groupSel = new Map<string, SelectionState>()
      for (let i = 0; i < group.photos.length; i++) {
        groupSel.set(group.photos[i].id, i === group.coverIndex ? 'keep' : 'delete')
      }
      next.set(groupId, groupSel)
      return next
    })
  }, [groups])

  const deleteAllExceptRecommended = useCallback((groupId: string) => {
    keepRecommended(groupId)
  }, [keepRecommended])

  const deleteSelected = useCallback(async (): Promise<number> => {
    const toDelete: string[] = []
    for (const [, groupSel] of selections) {
      for (const [photoId, sel] of groupSel) {
        if (sel === 'delete') toDelete.push(photoId)
      }
    }
    if (toDelete.length === 0) return 0

    let deleted = 0
    for (const id of toDelete) {
      try {
        await api.deletePhoto(id)
        deleted++
      } catch {
        // skip failed deletions
      }
    }

    // Remove deleted photos from groups
    setGroups(prev => {
      const deleteSet = new Set(toDelete)
      return prev
        .map(g => ({
          ...g,
          photos: g.photos.filter(p => !deleteSet.has(p.id)),
        }))
        .filter(g => g.photos.length >= 2)
    })

    setSelections(prev => {
      const next = new Map(prev)
      const deleteSet = new Set(toDelete)
      for (const [groupId, groupSel] of next) {
        const updated = new Map(groupSel)
        for (const id of deleteSet) {
          updated.delete(id)
        }
        next.set(groupId, updated)
      }
      return next
    })

    return deleted
  }, [selections])

  const selectedDeleteCount = useMemo(() => {
    let count = 0
    for (const [, groupSel] of selections) {
      for (const [, sel] of groupSel) {
        if (sel === 'delete') count++
      }
    }
    return count
  }, [selections])

  const value = useMemo(() => ({
    status, result, stats, groups, selections, progress,
    analyze, abortAnalyze, refreshStats, toggleSelection, keepRecommended, deleteAllExceptRecommended,
    deleteSelected, selectedDeleteCount,
  }), [status, result, stats, groups, selections, progress,
    analyze, abortAnalyze, refreshStats, toggleSelection, keepRecommended, deleteAllExceptRecommended,
    deleteSelected, selectedDeleteCount])

  return (
    <SimilarCtx.Provider value={value}>
      {children}
    </SimilarCtx.Provider>
  )
}
