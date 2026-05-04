import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { api, setActiveFolder, type PhotoGroup } from '../api'

interface AppContext {
  activeFolder: string
  photos: PhotoGroup[]
  settings: Record<string, string>
  isLoaded: boolean
  loadPhotos: (folder: string) => Promise<void>
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
  }, [])

  const value = useMemo<AppContext>(() => ({
    activeFolder,
    photos,
    settings,
    isLoaded,
    loadPhotos,
  }), [activeFolder, photos, settings, isLoaded, loadPhotos])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
