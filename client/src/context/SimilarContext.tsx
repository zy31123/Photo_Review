import { createContext, useContext, useState, useMemo, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { useApp } from './AppContext'
import { api, type SimilarGroup, type AnalyzeResult, type SimilarStats, type AnalyzeProgress, type PhotoGroup } from '../api'
import { photoEvents } from '../hooks/photoEvents'

type SelectionState = 'keep' | 'delete' | null

interface ClusterLightboxState {
  open: boolean
  groupId: string | null
  currentIndex: number
  compareMode: boolean
  compareIndex: number | null
}

interface SimilarContextType {
  status: 'idle' | 'analyzing' | 'done'
  result: AnalyzeResult | null
  stats: SimilarStats | null
  progress: AnalyzeProgress | null
  groups: SimilarGroup[]
  selections: Map<string, Map<string, SelectionState>>
  lightbox: ClusterLightboxState
  focusedIndex: number
  analyze: () => Promise<void>
  abortAnalyze: () => void
  refreshStats: () => Promise<void>
  toggleSelection: (groupId: string, photoId: string) => void
  keepRecommended: (groupId: string) => void
  deleteAllExceptRecommended: (groupId: string) => void
  deleteSelected: () => Promise<number>
  selectedDeleteCount: number
  openLightbox: (groupId: string) => void
  closeLightbox: () => void
  navigateLightbox: (index: number) => void
  toggleCompareMode: () => void
  setCompareIndex: (index: number) => void
  directDelete: (photoId: string) => Promise<void>
  setFocusedIndex: (index: number) => void
  keepRecommendedFocused: () => void
  openLightboxFocused: () => void
}

const SimilarCtx = createContext<SimilarContextType | null>(null)

export function useSimilar() {
  const ctx = useContext(SimilarCtx)
  if (!ctx) throw new Error('useSimilar must be used within SimilarProvider')
  return ctx
}

export function SimilarProvider({ children }: { children: ReactNode }) {
  const { activeFolder, pushUndo, toast, undoLastAction } = useApp()

  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done'>('idle')
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [stats, setStats] = useState<SimilarStats | null>(null)
  const [groups, setGroups] = useState<SimilarGroup[]>([])
  const [selections, setSelections] = useState<Map<string, Map<string, SelectionState>>>(new Map())
  const [progress, setProgress] = useState<AnalyzeProgress | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)

  // Clamp focusedIndex when groups shrink
  useEffect(() => {
    if (focusedIndex >= groups.length && groups.length > 0) {
      setFocusedIndex(groups.length - 1)
    } else if (groups.length === 0) {
      setFocusedIndex(0)
    }
  }, [groups.length, focusedIndex])
  const [lightbox, setLightbox] = useState<ClusterLightboxState>({
    open: false, groupId: null, currentIndex: 0, compareMode: false, compareIndex: null,
  })
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

    // Collect photo data and trash paths for undo
    const undoItems: Array<{ photoId: string; photoData: PhotoGroup; trashPaths: Record<string, string>; previousReviewAction?: string | null }> = []
    const deletedIds = new Set<string>()

    for (const id of toDelete) {
      // Find the photo in groups
      let photoData: PhotoGroup | null = null
      for (const g of groups) {
        const found = g.photos.find(p => p.id === id)
        if (found) { photoData = found; break }
      }
      if (!photoData) continue

      try {
        const result = await api.deletePhoto(id)
        deletedIds.add(id)
        undoItems.push({
          photoId: id,
          photoData: { ...photoData },
          trashPaths: result.trashPaths,
          previousReviewAction: photoData.reviewAction ?? null,
        })
      } catch {
        // skip failed deletions
      }
    }

    if (undoItems.length > 0) {
      pushUndo({
        type: 'delete_batch',
        photoId: undoItems[0].photoId,
        before: 'deleted',
        after: null,
        items: undoItems,
      })
      toast.show(`已删除 ${undoItems.length} 张照片`, 5000, {
        label: '撤销',
        onClick: () => undoLastAction(),
      })
    }

    // Remove deleted photos from groups
    setGroups(prev => {
      return prev
        .map(g => ({
          ...g,
          photos: g.photos.filter(p => !deletedIds.has(p.id)),
        }))
        .filter(g => g.photos.length >= 2)
    })

    setSelections(prev => {
      const next = new Map(prev)
      for (const [groupId, groupSel] of next) {
        const updated = new Map(groupSel)
        for (const id of deletedIds) {
          updated.delete(id)
        }
        next.set(groupId, updated)
      }
      return next
    })

    return deletedIds.size
  }, [selections, groups, pushUndo, toast, undoLastAction])

  const selectedDeleteCount = useMemo(() => {
    let count = 0
    for (const [, groupSel] of selections) {
      for (const [, sel] of groupSel) {
        if (sel === 'delete') count++
      }
    }
    return count
  }, [selections])

  const openLightbox = useCallback((groupId: string) => {
    setLightbox({ open: true, groupId, currentIndex: 0, compareMode: false, compareIndex: null })
  }, [])

  const closeLightbox = useCallback(() => {
    setLightbox({ open: false, groupId: null, currentIndex: 0, compareMode: false, compareIndex: null })
  }, [])

  const navigateLightbox = useCallback((index: number) => {
    setLightbox(prev => ({ ...prev, currentIndex: index }))
  }, [])

  const toggleCompareMode = useCallback(() => {
    setLightbox(prev => {
      if (!prev.compareMode) {
        // Enter compare: pick next photo as default compare target
        const group = groups.find(g => g.id === prev.groupId)
        const nextIdx = prev.currentIndex < (group?.photos.length ?? 0) - 1 ? prev.currentIndex + 1 : prev.currentIndex - 1
        return { ...prev, compareMode: true, compareIndex: nextIdx >= 0 ? nextIdx : null }
      }
      return { ...prev, compareMode: false, compareIndex: null }
    })
  }, [groups])

  const setCompareIndex = useCallback((index: number) => {
    setLightbox(prev => ({ ...prev, compareIndex: index }))
  }, [])

  const directDelete = useCallback(async (photoId: string) => {
    // Find photo data before deletion
    let photoData: PhotoGroup | null = null
    for (const g of groups) {
      const found = g.photos.find(p => p.id === photoId)
      if (found) { photoData = found; break }
    }

    let trashPaths: Record<string, string> | undefined
    try {
      const result = await api.deletePhoto(photoId)
      trashPaths = result.trashPaths
    } catch {
      return
    }

    // Push undo entry
    if (photoData && trashPaths) {
      pushUndo({
        type: 'delete',
        photoId,
        before: 'deleted',
        after: null,
        photoData: { ...photoData },
        trashPaths,
        previousReviewAction: photoData.reviewAction ?? null,
      })
      toast.show(`已删除: ${photoData.name}`, 5000, {
        label: '撤销',
        onClick: () => undoLastAction(),
      })
    }

    setGroups(prev => {
      const deleteSet = new Set([photoId])
      const updated = prev.map(g => ({
        ...g,
        photos: g.photos.filter(p => !deleteSet.has(p.id)),
      }))
      // Remove groups with <2 photos
      const filtered = updated.filter(g => g.photos.length >= 2)

      // If the group this photo belonged to is now too small, close lightbox
      // NOTE: look in `prev` (before filter) to find the group that contained this photo
      const targetGroup = prev.find(g => g.photos.some(p => p.id === photoId))
      if (targetGroup && targetGroup.photos.length < 2) {
        setLightbox({ open: false, groupId: null, currentIndex: 0, compareMode: false, compareIndex: null })
      } else if (targetGroup) {
        // Adjust currentIndex if needed
        setLightbox(prev => {
          const deletedIdx = targetGroup.photos.findIndex(p => p.id === photoId)
          let newIdx = prev.currentIndex
          if (deletedIdx >= 0 && deletedIdx <= prev.currentIndex) {
            newIdx = Math.max(0, prev.currentIndex - 1)
          }
          // Clamp to new group size
          const remainingGroup = filtered.find(g => g.id === prev.groupId)
          if (remainingGroup) {
            newIdx = Math.min(newIdx, remainingGroup.photos.length - 1)
          }
          // Also fix compareIndex
          let newCompareIdx = prev.compareIndex
          if (newCompareIdx !== null && deletedIdx >= 0 && deletedIdx <= newCompareIdx) {
            newCompareIdx = Math.max(0, newCompareIdx - 1)
            const rg = remainingGroup
            if (rg) newCompareIdx = Math.min(newCompareIdx, rg.photos.length - 1)
          }
          return { ...prev, currentIndex: newIdx, compareIndex: newCompareIdx }
        })
      }

      return filtered
    })

    setSelections(prev => {
      const next = new Map(prev)
      for (const [groupId, groupSel] of next) {
        const updated = new Map(groupSel)
        updated.delete(photoId)
        next.set(groupId, updated)
      }
      return next
    })
  }, [groups, pushUndo, toast, undoLastAction])

  // Listen for photo restore events (from undo)
  useEffect(() => {
    const singleHandler = ({ photo }: { photoId: string; photo: PhotoGroup }) => {
      setGroups(prev => {
        // Check if already in a group
        for (const g of prev) {
          if (g.photos.some(p => p.id === photo.id)) return prev
        }
        // Try to find the best group (same folder) or create new entry
        // For now, add to the first group that has room
        if (prev.length > 0) {
          return prev.map((g, i) =>
            i === 0 ? { ...g, photos: [...g.photos, photo] } : g
          )
        }
        return prev
      })
    }
    const batchHandler = ({ photos }: { photos: PhotoGroup[] }) => {
      setGroups(prev => {
        const existingIds = new Set(prev.flatMap(g => g.photos.map(p => p.id)))
        const newPhotos = photos.filter(p => !existingIds.has(p.id))
        if (newPhotos.length === 0 || prev.length === 0) return prev
        return prev.map((g, i) =>
          i === 0 ? { ...g, photos: [...g.photos, ...newPhotos] } : g
        )
      })
    }
    photoEvents.on('photo:restored', singleHandler)
    photoEvents.on('photos:restored-batch', batchHandler)
    return () => {
      photoEvents.off('photo:restored', singleHandler)
      photoEvents.off('photos:restored-batch', batchHandler)
    }
  }, [])

  const keepRecommendedFocused = useCallback(() => {
    const group = groups[focusedIndex]
    if (group) keepRecommended(group.id)
  }, [groups, focusedIndex, keepRecommended])

  const openLightboxFocused = useCallback(() => {
    const group = groups[focusedIndex]
    if (group) openLightbox(group.id)
  }, [groups, focusedIndex, openLightbox])

  const value = useMemo(() => ({
    status, result, stats, groups, selections, progress, lightbox, focusedIndex,
    analyze, abortAnalyze, refreshStats, toggleSelection, keepRecommended, deleteAllExceptRecommended,
    deleteSelected, selectedDeleteCount,
    openLightbox, closeLightbox, navigateLightbox, toggleCompareMode, setCompareIndex, directDelete,
    setFocusedIndex, keepRecommendedFocused, openLightboxFocused,
  }), [status, result, stats, groups, selections, progress, lightbox, focusedIndex,
    analyze, abortAnalyze, refreshStats, toggleSelection, keepRecommended, deleteAllExceptRecommended,
    deleteSelected, selectedDeleteCount,
    openLightbox, closeLightbox, navigateLightbox, toggleCompareMode, setCompareIndex, directDelete,
    setFocusedIndex, keepRecommendedFocused, openLightboxFocused])

  return (
    <SimilarCtx.Provider value={value}>
      {children}
    </SimilarCtx.Provider>
  )
}
