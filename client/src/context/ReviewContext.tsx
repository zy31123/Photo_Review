import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect, type ReactNode } from 'react'
import { api, type PhotoGroup, type SubfolderInfo } from '../api'
import { useApp } from './AppContext'
import { useDateGroups, type StatusFilter } from '../hooks/useDateGroups'

interface ReviewState {
  photos: PhotoGroup[]
  filteredPhotos: PhotoGroup[]
  currentIndex: number
  currentPhoto: PhotoGroup | null
  selectedDate: string | null
  leftSidebarOpen: boolean
  rightPanelOpen: boolean
  loading: boolean
  error: string
  statusFilter: StatusFilter
  subfolderFilter: string | null
  subfolders: SubfolderInfo[]
  reviewedCount: number
  monthGroups: ReturnType<typeof useDateGroups>['monthGroups']
}

interface ReviewActions {
  goTo: (index: number) => void
  setDateFilter: (date: string | null) => void
  setStatusFilter: (filter: StatusFilter) => void
  setSubfolderFilter: (filter: string | null) => void
  toggleLeftSidebar: () => void
  toggleRightPanel: () => void
  handleAction: (action: 'keep' | 'deleted') => void
  refresh: () => void
}

type ReviewContext = ReviewState & ReviewActions

const Ctx = createContext<ReviewContext | null>(null)

export function useReview(): ReviewContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useReview must be used within ReviewProvider')
  return ctx
}

export function ReviewProvider({ startId, initialSubfolder, children }: { startId?: string; initialSubfolder?: string; children: ReactNode }) {
  const { photos, removePhoto, updatePhoto, pushUndo, toast, undoLastAction } = useApp()

  // UI-only state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [subfolderFilter, setSubfolderFilter] = useState<string | null>(initialSubfolder ?? null)
  const [subfolders, setSubfolders] = useState<SubfolderInfo[]>([])
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const processingRef = useRef(false)

  // Photos derived from AppContext — no redundant local copy
  const { monthGroups, filteredPhotos } = useDateGroups(photos, selectedDate, statusFilter, subfolderFilter)

  const currentPhoto = filteredPhotos[currentIndex] ?? null
  const reviewedCount = photos.filter(p => !!p.reviewAction).length

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= filteredPhotos.length) return
    setCurrentIndex(index)
  }, [filteredPhotos.length])

  const setDateFilter = useCallback((date: string | null) => {
    setSelectedDate(date)
    setCurrentIndex(0)
  }, [])

  const toggleLeftSidebar = useCallback(() => setLeftSidebarOpen(v => !v), [])
  const toggleRightPanel = useCallback(() => setRightPanelOpen(v => !v), [])

  const handleSetSubfolderFilter = useCallback((filter: string | null) => {
    setSubfolderFilter(filter)
    setSelectedDate(null)
    setCurrentIndex(0)
  }, [])

  const handleAction = useCallback(async (action: 'keep' | 'deleted') => {
    if (!currentPhoto || processingRef.current) return
    processingRef.current = true
    setError('')
    const photoId = currentPhoto.id
    const photoSnapshot = { ...currentPhoto }
    try {
      await api.submitReview(photoId, action, 'sequential')
      if (action === 'deleted') {
        const result = await api.deletePhoto(photoId)
        pushUndo({
          type: 'delete',
          photoId,
          before: 'deleted',
          after: null,
          photoData: photoSnapshot,
          trashPaths: result.trashPaths,
          previousReviewAction: photoSnapshot.reviewAction ?? null,
        })
        // Remove from single source of truth — filteredPhotos updates reactively
        removePhoto(photoId)
        setCurrentIndex(prev => Math.max(0, Math.min(prev, filteredPhotos.length - 2)))
        toast.show(`已删除: ${photoSnapshot.name}`, 5000, {
          label: '撤销',
          onClick: () => undoLastAction(),
        })
      } else {
        // Stamp reviewAction so reviewedCount and statusFilter stay correct
        updatePhoto(photoId, { reviewAction: action, reviewedAt: new Date().toISOString() })
        setCurrentIndex(prev => prev < filteredPhotos.length - 1 ? prev + 1 : prev)
      }
    } catch (e: any) {
      setError(e.message || '操作失败')
    } finally {
      processingRef.current = false
    }
  }, [currentPhoto, filteredPhotos.length, removePhoto, updatePhoto, pushUndo, toast, undoLastAction])

  // Use refs to avoid refresh re-triggering on every photos change
  const photosRef = useRef(photos)
  photosRef.current = photos
  const startIdRef = useRef(startId)
  startIdRef.current = startId

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const subs = await api.getSubfolders()
      setSubfolders(subs)

      const currentPhotos = photosRef.current
      const sid = startIdRef.current
      if (sid) {
        const idx = currentPhotos.findIndex(p => p.id === sid)
        setCurrentIndex(idx >= 0 ? idx : 0)
      } else {
        const firstUnreviewed = currentPhotos.findIndex(p => !p.reviewAction)
        setCurrentIndex(firstUnreviewed >= 0 ? firstUnreviewed : 0)
      }
    } catch (e: any) {
      setError(e.message || '加载子文件夹失败')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — runs once on mount

  // Initial load only
  useEffect(() => { refresh() }, [refresh])

  const value = useMemo<ReviewContext>(() => ({
    photos,
    filteredPhotos,
    currentIndex,
    currentPhoto,
    selectedDate,
    leftSidebarOpen,
    rightPanelOpen,
    loading,
    error,
    statusFilter,
    subfolderFilter,
    subfolders,
    reviewedCount,
    monthGroups,
    goTo,
    setDateFilter,
    setStatusFilter,
    setSubfolderFilter: handleSetSubfolderFilter,
    toggleLeftSidebar,
    toggleRightPanel,
    handleAction,
    refresh,
  }), [photos, filteredPhotos, currentIndex, currentPhoto, selectedDate,
    leftSidebarOpen, rightPanelOpen, loading, error, statusFilter, subfolderFilter, subfolders, reviewedCount, monthGroups,
    goTo, setDateFilter, setStatusFilter, handleSetSubfolderFilter, toggleLeftSidebar, toggleRightPanel, handleAction, refresh])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
