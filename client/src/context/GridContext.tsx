import { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useApp } from './AppContext'
import { api, type SubfolderInfo, type PhotoGroup } from '../api'
import { useDateGroups } from '../hooks/useDateGroups'

export interface DateSection {
  date: string
  label: string
  count: number
  photos: PhotoGroup[]
}

export type VirtualItem =
  | { type: 'header'; date: string; label: string; count: number }
  | { type: 'photo-row'; photos: PhotoGroup[] }

interface GridContextType {
  photos: PhotoGroup[]
  subfolderFilter: string | null
  subfolders: SubfolderInfo[]
  selectedDate: string | null
  columns: number
  loading: boolean
  monthGroups: ReturnType<typeof useDateGroups>['monthGroups']
  filteredPhotos: PhotoGroup[]
  dateSections: DateSection[]
  virtualItems: VirtualItem[]
  dateIndexMap: Map<string, number>
  setSubfolderFilter: (filter: string | null) => void
  setSelectedDate: (date: string | null) => void
  setColumns: (n: number) => void
  refresh: () => Promise<void>
  scrollToRef: React.RefObject<(date: string) => void>
}

const GridContext = createContext<GridContextType | null>(null)

export function useGrid() {
  const ctx = useContext(GridContext)
  if (!ctx) throw new Error('useGrid must be used within GridProvider')
  return ctx
}

export function GridProvider({ children }: { children: ReactNode }) {
  const { photos, activeFolder } = useApp()

  const [subfolderFilter, setSubfolderFilterState] = useState<string | null>(null)
  const [subfolders, setSubfolders] = useState<SubfolderInfo[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [columns, setColumns] = useState(5)
  const [loading, setLoading] = useState(false)

  const scrollToRef = useRef<(date: string) => void>(() => {})

  const { monthGroups, filteredPhotos: dateGroupedPhotos } = useDateGroups(
    photos, selectedDate, 'all', subfolderFilter,
  )

  const filteredPhotos = useMemo(() => {
    if (!subfolderFilter) return dateGroupedPhotos
    return dateGroupedPhotos.filter(p => p.subfolder === subfolderFilter)
  }, [dateGroupedPhotos, subfolderFilter])

  const dateSections = useMemo<DateSection[]>(() => {
    const sections: DateSection[] = []
    for (const month of monthGroups) {
      for (const dg of month.dates) {
        if (selectedDate && dg.date !== selectedDate) continue
        if (subfolderFilter) {
          const filtered = dg.photos.filter(p => p.subfolder === subfolderFilter)
          if (filtered.length === 0) continue
          sections.push({ date: dg.date, label: dg.label, count: filtered.length, photos: filtered })
        } else {
          sections.push({ date: dg.date, label: dg.label, count: dg.count, photos: dg.photos })
        }
      }
    }
    return sections
  }, [monthGroups, selectedDate, subfolderFilter])

  const virtualItems = useMemo<VirtualItem[]>(() => {
    const items: VirtualItem[] = []
    for (const section of dateSections) {
      items.push({ type: 'header', date: section.date, label: section.label, count: section.count })
      for (let i = 0; i < section.photos.length; i += columns) {
        items.push({ type: 'photo-row', photos: section.photos.slice(i, i + columns) })
      }
    }
    return items
  }, [dateSections, columns])

  const dateIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    virtualItems.forEach((item, idx) => {
      if (item.type === 'header') map.set(item.date, idx)
    })
    return map
  }, [virtualItems])

  const setSubfolderFilter = useCallback((filter: string | null) => {
    setSubfolderFilterState(filter)
    setSelectedDate(null)
  }, [])

  const refresh = useCallback(async () => {
    if (!activeFolder) return
    setLoading(true)
    try {
      const sf = await api.getSubfolders()
      setSubfolders(sf)
    } finally {
      setLoading(false)
    }
  }, [activeFolder])

  const value = useMemo(() => ({
    photos, subfolderFilter, subfolders, selectedDate, columns, loading,
    monthGroups, filteredPhotos, dateSections, virtualItems, dateIndexMap,
    setSubfolderFilter, setSelectedDate, setColumns,
    refresh, scrollToRef,
  }), [photos, subfolderFilter, subfolders, selectedDate, columns, loading,
    monthGroups, filteredPhotos, dateSections, virtualItems, dateIndexMap,
    setSubfolderFilter, setSelectedDate, setColumns, refresh, scrollToRef])

  return (
    <GridContext.Provider value={value}>
      {children}
    </GridContext.Provider>
  )
}
