import { createContext, useContext } from 'react'
import type { PhotoGroup } from '../api'

interface RandomNavData {
  currentPhoto: PhotoGroup | null
  batchReviewed: number
  batchTotal: number
  sessionReviewed: number
  rightPanelOpen: boolean
  onToggleRightPanel: () => void
  cacheDays: number
  onCacheDaysChange: (days: number) => void
}

const RandomNavContext = createContext<RandomNavData | null>(null)

export function RandomNavProvider({ children, ...value }: RandomNavData & { children: React.ReactNode }) {
  return <RandomNavContext.Provider value={value}>{children}</RandomNavContext.Provider>
}

export function useRandomNav() {
  return useContext(RandomNavContext)
}
