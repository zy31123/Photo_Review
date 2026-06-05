import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { api, setActiveFolder, type PhotoGroup } from '../api'
import { useUndoHistory, type UndoAction } from '../hooks/useUndoHistory'
import { useToast } from '../hooks/useToast'
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
      api.getPhotos({ limit: 2000 }),
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

  const undoLastAction = useCallback(async (): Promise<UndoAction | null> => {
    const action = await undoHistory.undo()
    if (!action) return null

    setPhotos(prev => prev.map(p => {
      if (p.id !== action.photoId) return p
      switch (action.type) {
        case 'rating': return { ...p, rating: action.before as number }
        case 'favorite': return { ...p, favorite: action.before as boolean }
        case 'review': return { ...p, reviewAction: action.before }
        default: return p
      }
    }))

    const typeLabels: Record<string, string> = { rating: '评分', favorite: '收藏', review: '审阅' }
    toast.show(`已撤销: ${typeLabels[action.type] || action.type}`)

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
    toast,
  }), [activeFolder, photos, settings, isLoaded, loadPhotos,
    updatePhotoRating, updatePhotoFavorite, undoLastAction, toast])

  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </Ctx.Provider>
  )
}
