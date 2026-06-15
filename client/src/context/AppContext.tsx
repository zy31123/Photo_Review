import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { api, setActiveFolder, type PhotoGroup } from '../api'
import { useUndoHistory, type UndoAction } from '../hooks/useUndoHistory'
import { useToast } from '../hooks/useToast'
import { photoEvents } from '../hooks/photoEvents'
import ToastContainer from '../components/ui/Toast'

interface AppContext {
  activeFolder: string
  photos: PhotoGroup[]
  settings: Record<string, string>
  isLoaded: boolean
  loadPhotos: (folder: string) => Promise<void>
  updatePhotoRating: (photoId: string, rating: number) => Promise<void>
  updatePhotoFavorite: (photoId: string, favorite?: boolean) => Promise<void>
  undoLastAction: () => Promise<UndoAction | null>
  pushUndo: (action: UndoAction) => void
  toast: ReturnType<typeof useToast>
}

const Ctx = createContext<AppContext | null>(null)

export function useApp(): AppContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeFolder, setActive] = useState('')
  const [photos, setPhotos] = useState<PhotoGroup[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [isLoaded, setIsLoaded] = useState(false)
  const undoHistory = useUndoHistory()
  const toast = useToast()
  const photosRef = useRef(photos)
  photosRef.current = photos

  const loadPhotos = useCallback(async (folder: string) => {
    setActiveFolder(folder)
    setActive(folder)
    await api.scanFolder(folder)
    const [result, s] = await Promise.all([
      api.getPhotos({ limit: 5000 }),
      api.getSettings(),
    ])
    setPhotos(result.photos)
    setSettings(s)
    setIsLoaded(true)
    undoHistory.clear()
  }, [undoHistory])

  const updatePhotoRating = useCallback(async (photoId: string, rating: number) => {
    const photo = photosRef.current.find(p => p.id === photoId)
    if (!photo) return
    const before = photo.rating ?? 0
    await api.setRating(photoId, rating)
    undoHistory.push({ type: 'rating', photoId, before, after: rating })
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, rating } : p))
  }, [undoHistory])

  const updatePhotoFavorite = useCallback(async (photoId: string, favorite?: boolean) => {
    const photo = photosRef.current.find(p => p.id === photoId)
    if (!photo) return
    const before = photo.favorite ?? false
    const result = await api.toggleFavorite(photoId)
    const newValue = result.favorite
    undoHistory.push({ type: 'favorite', photoId, before, after: newValue })
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, favorite: newValue } : p))
  }, [undoHistory])

  const pushUndo = useCallback((action: UndoAction) => {
    undoHistory.push(action)
  }, [undoHistory])

  const undoLastAction = useCallback(async (): Promise<UndoAction | null> => {
    const action = await undoHistory.undo()
    if (!action) return null

    switch (action.type) {
      case 'rating':
      case 'favorite':
      case 'review': {
        // Update existing photo in list
        setPhotos(prev => prev.map(p => {
          if (p.id !== action.photoId) return p
          switch (action.type) {
            case 'rating': return { ...p, rating: action.before as number }
            case 'favorite': return { ...p, favorite: action.before as boolean }
            case 'review': return { ...p, reviewAction: action.before ?? null }
            default: return p
          }
        }))

        // For review undo: if the photo was removed from list (random mode delete), re-add it
        if (action.type === 'review' && action.photoData) {
          setPhotos(prev => {
            if (prev.find(p => p.id === action.photoId)) return prev
            const restored = {
              ...action.photoData!,
              reviewAction: action.before ?? null,
            }
            return [...prev, restored]
          })
          photoEvents.emit('photo:restored', {
            photoId: action.photoId,
            photo: { ...action.photoData, reviewAction: action.before ?? null },
          })
        }

        const typeLabels: Record<string, string> = { rating: '评分', favorite: '收藏', review: '审阅' }
        toast.show(`已撤销: ${typeLabels[action.type]}`)
        break
      }

      case 'delete': {
        // The API call was already made in undoHistory.undo()
        // Re-fetch the restored photo with status
        try {
          const result = await api.getPhotos({ limit: 5000 })
          const restoredPhoto = result.photos.find(p => p.id === action.photoId)
          if (restoredPhoto) {
            setPhotos(prev => {
              if (prev.find(p => p.id === action.photoId)) return prev
              return [...prev, restoredPhoto]
            })
            photoEvents.emit('photo:restored', { photoId: action.photoId, photo: restoredPhoto })
          }
        } catch {
          // If re-fetch fails, try with stored photoData
          if (action.photoData) {
            setPhotos(prev => {
              if (prev.find(p => p.id === action.photoId)) return prev
              return [...prev, action.photoData!]
            })
            photoEvents.emit('photo:restored', { photoId: action.photoId, photo: action.photoData! })
          }
        }
        toast.show(`已恢复: ${action.photoData?.name || '照片'}`)
        break
      }

      case 'delete_batch': {
        const count = action.items?.length ?? 0
        try {
          const result = await api.getPhotos({ limit: 5000 })
          const restoredIds = new Set(action.items?.map(i => i.photoId) ?? [])
          const restoredPhotos = result.photos.filter(p => restoredIds.has(p.id))
          if (restoredPhotos.length > 0) {
            setPhotos(prev => {
              const existingIds = new Set(prev.map(p => p.id))
              const newPhotos = restoredPhotos.filter(p => !existingIds.has(p.id))
              if (newPhotos.length === 0) return prev
              return [...prev, ...newPhotos]
            })
            photoEvents.emit('photos:restored-batch', { photos: restoredPhotos })
          }
        } catch {
          if (action.items) {
            const restoredPhotos = action.items.map(i => i.photoData)
            setPhotos(prev => {
              const existingIds = new Set(prev.map(p => p.id))
              const newPhotos = restoredPhotos.filter(p => !existingIds.has(p.id))
              if (newPhotos.length === 0) return prev
              return [...prev, ...newPhotos]
            })
            photoEvents.emit('photos:restored-batch', { photos: restoredPhotos })
          }
        }
        toast.show(`已恢复 ${count} 张照片`)
        break
      }
    }

    return action
  }, [undoHistory, toast])

  const value = useMemo<AppContext>(() => ({
    activeFolder,
    photos,
    settings,
    isLoaded,
    loadPhotos,
    updatePhotoRating,
    updatePhotoFavorite,
    undoLastAction,
    pushUndo,
    toast,
  }), [activeFolder, photos, settings, isLoaded, loadPhotos,
    updatePhotoRating, updatePhotoFavorite, undoLastAction, pushUndo, toast])

  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </Ctx.Provider>
  )
}
