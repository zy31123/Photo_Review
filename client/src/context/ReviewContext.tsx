import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect, type ReactNode } from 'react'
import { api, type PhotoGroup, type SubfolderInfo } from '../api'
import { useApp } from './AppContext'
import { useDateGroups, type StatusFilter } from '../hooks/useDateGroups'
import { photoEvents } from '../hooks/photoEvents'

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
  const { photos: appPhotos, pushUndo, toast, undoLastAction } = useApp()
  const [photos, setPhotos] = useState<PhotoGroup[]>([])
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

  const { monthGroups, filteredPhotos, dateOfIndex } = useDateGroups(photos, selectedDate, statusFilter, subfolderFilter)

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
      let trashPaths: Record<string, string> | undefined
      if (action === 'deleted') {
        const result = await api.deletePhoto(photoId)
        trashPaths = result.trashPaths
      }
      if (action === 'deleted') {
        pushUndo({
          type: 'delete',
          photoId,
          before: 'deleted',
          after: null,
          photoData: photoSnapshot,
          trashPaths,
          previousReviewAction: photoSnapshot.reviewAction ?? null,
        })
        const remaining = photos.filter(p => p.id !== photoId)
        setPhotos(remaining)
        setCurrentIndex(Math.max(0, Math.min(currentIndex, remaining.length - 1)))
        toast.show(`已删除: ${photoSnapshot.name}`, 5000, {
          label: '撤销',
          onClick: () => undoLastAction(),
        })
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
  }, [currentPhoto, currentIndex, filteredPhotos.length, photos, pushUndo, toast, undoLastAction])

  // Listen for photo restore events (from undo)
  useEffect(() => {
    const handler = ({ photo }: { photoId: string; photo: PhotoGroup }) => {
      setPhotos(prev => {
        if (prev.find(p => p.id === photo.id)) return prev
        return [...prev, photo]
      })
    }
    photoEvents.on('photo:restored', handler)
    return () => { photoEvents.off('photo:restored', handler) }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const resultPhotos = appPhotos.length > 0 ? appPhotos : (await api.getPhotos({ limit: 5000 })).photos
      const subs = await api.getSubfolders()
      setPhotos(resultPhotos)
      setSubfolders(subs)

      if (startId) {
        const idx = resultPhotos.findIndex(p => p.id === startId)
        setCurrentIndex(idx >= 0 ? idx : 0)
      } else {
        const firstUnreviewed = resultPhotos.findIndex(p => !p.reviewAction)
        setCurrentIndex(firstUnreviewed >= 0 ? firstUnreviewed : 0)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [appPhotos, startId])

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
