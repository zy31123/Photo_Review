import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { api, setActiveFolder, type PhotoGroup } from '../api'
import { useUndoEngine } from '../hooks/useUndoEngine'
import { useToast } from '../hooks/useToast'
import ToastContainer from '../components/ui/Toast'
import type { UndoAction } from '../hooks/useUndoHistory'

interface AppContext {
  activeFolder: string
  photos: PhotoGroup[]
  settings: Record<string, string>
  isLoaded: boolean
  loadPhotos: (folder: string) => Promise<void>
  updatePhotoRating: (photoId: string, rating: number) => Promise<void>
  updatePhotoFavorite: (photoId: string, favorite?: boolean) => Promise<void>
  removePhoto: (photoId: string) => void
  updatePhoto: (photoId: string, patch: Partial<PhotoGroup>) => void
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
  const toast = useToast()
  const { undoLastAction, pushUndo, clearUndo } = useUndoEngine(setPhotos, toast.show)
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
    clearUndo()
  }, [clearUndo])

  const updatePhotoRating = useCallback(async (photoId: string, rating: number) => {
    const photo = photosRef.current.find(p => p.id === photoId)
    if (!photo) return
    await api.setRating(photoId, rating)
    pushUndo({ type: 'rating', photoId, before: photo.rating ?? 0, after: rating })
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, rating } : p))
  }, [pushUndo])

  const updatePhotoFavorite = useCallback(async (photoId: string, favorite?: boolean) => {
    const photo = photosRef.current.find(p => p.id === photoId)
    if (!photo) return
    const result = await api.toggleFavorite(photoId)
    pushUndo({ type: 'favorite', photoId, before: photo.favorite ?? false, after: result.favorite })
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, favorite: result.favorite } : p))
  }, [pushUndo])

  const removePhoto = useCallback((photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId))
  }, [])

  const updatePhoto = useCallback((photoId: string, patch: Partial<PhotoGroup>) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, ...patch } : p))
  }, [])

  const value = useMemo<AppContext>(() => ({
    activeFolder,
    photos,
    settings,
    isLoaded,
    loadPhotos,
    updatePhotoRating,
    updatePhotoFavorite,
    removePhoto,
    updatePhoto,
    undoLastAction,
    pushUndo,
    toast,
  }), [activeFolder, photos, settings, isLoaded, loadPhotos,
    updatePhotoRating, updatePhotoFavorite, removePhoto, updatePhoto,
    undoLastAction, pushUndo, toast])

  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </Ctx.Provider>
  )
}
