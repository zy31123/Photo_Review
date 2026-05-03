import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { api, type PhotoGroup } from '../api'
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
  reviewedCount: number
  monthGroups: ReturnType<typeof useDateGroups>['monthGroups']
}

interface ReviewActions {
  goTo: (index: number) => void
  setDateFilter: (date: string | null) => void
  setStatusFilter: (filter: StatusFilter) => void
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

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<PhotoGroup[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const processingRef = useRef(false)

  const { monthGroups, filteredPhotos, dateOfIndex } = useDateGroups(photos, selectedDate, statusFilter)

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

  const handleAction = useCallback(async (action: 'keep' | 'deleted') => {
    if (!currentPhoto || processingRef.current) return
    processingRef.current = true
    setError('')
    const photoId = currentPhoto.id
    try {
      await api.submitReview(photoId, action, 'sequential')
      if (action === 'deleted') {
        await api.deletePhoto(photoId)
      }
      if (action === 'deleted') {
        const remaining = photos.filter(p => p.id !== photoId)
        setPhotos(remaining)
        setCurrentIndex(Math.max(0, Math.min(currentIndex, remaining.length - 1)))
      } else {
        setPhotos(prev => prev.map(p =>
          p.id === photoId ? { ...p, reviewAction: action, reviewedAt: new Date().toISOString() } : p
        ))
        if (currentIndex < filteredPhotos.length - 1) {
          setCurrentIndex(currentIndex + 1)
        }
      }
    } catch (e: any) {
      setError(e.message || '操作失败')
    } finally {
      processingRef.current = false
    }
  }, [currentPhoto, currentIndex, filteredPhotos.length, photos])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.getPhotos({ limit: 2000 })
      setPhotos(result.photos)
      // Jump to first unreviewed photo
      const firstUnreviewed = result.photos.findIndex(p => !p.reviewAction)
      setCurrentIndex(firstUnreviewed >= 0 ? firstUnreviewed : 0)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

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
    reviewedCount,
    monthGroups,
    goTo,
    setDateFilter,
    setStatusFilter,
    toggleLeftSidebar,
    toggleRightPanel,
    handleAction,
    refresh,
  }), [photos, filteredPhotos, currentIndex, currentPhoto, selectedDate,
    leftSidebarOpen, rightPanelOpen, loading, error, statusFilter, reviewedCount, monthGroups,
    goTo, setDateFilter, setStatusFilter, toggleLeftSidebar, toggleRightPanel, handleAction, refresh])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
