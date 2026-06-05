import { useEffect, useCallback, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Minus, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { GridProvider, useGrid, type VirtualItem } from '../context/GridContext'
import { api } from '../api'
import NavBar from '../components/NavBar'
import FolderSidebar from '../components/grid/FolderSidebar'
import YearTimeline from '../components/grid/YearTimeline'
import Lightbox from '../components/grid/Lightbox'

function GridToolbar() {
  const { columns, setColumns, filteredPhotos } = useGrid()
  return (
    <div className="h-[var(--toolbar-height)] border-b border-border-subtle bg-glass backdrop-blur-xl flex items-center px-4 gap-3 shrink-0">
      <span className="text-text-secondary text-caption font-medium">{filteredPhotos.length.toLocaleString()} 张照片</span>
      <div className="ml-auto flex items-center gap-1 bg-fill-subtle rounded-md p-0.5">
        <button
          onClick={() => setColumns(Math.max(2, columns - 1))}
          disabled={columns <= 2}
          className="w-7 h-7 rounded-sm flex items-center justify-center text-text-secondary hover:bg-bg-elevated disabled:opacity-30 transition-colors duration-fast"
        >
          <Minus className="size-3" strokeWidth={1.5} />
        </button>
        <span className="text-text text-caption tabular-nums w-5 text-center font-semibold">{columns}</span>
        <button
          onClick={() => setColumns(Math.min(8, columns + 1))}
          disabled={columns >= 8}
          className="w-7 h-7 rounded-sm flex items-center justify-center text-text-secondary hover:bg-bg-elevated disabled:opacity-30 transition-colors duration-fast"
        >
          <Plus className="size-3" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

function GridLayout() {
  const navigate = useNavigate()
  const {
    virtualItems, dateIndexMap, columns, filteredPhotos, subfolderFilter, scrollToRef,
  } = useGrid()

  const scrollRef = useRef<HTMLDivElement>(null)
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const [stickyHeader, setStickyHeader] = useState<{ label: string; count: number } | null>(null)

  const photoIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    filteredPhotos.forEach((p, i) => map.set(p.id, i))
    return map
  }, [filteredPhotos])

  const HEADER_HEIGHT_REM = 3.5
  const GAP_REM = 0.25

  const rowVirtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
      const item = virtualItems[index]
      if (!item) return 100
      if (item.type === 'header') return HEADER_HEIGHT_REM * rootFontSize
      const vw = scrollRef.current?.clientWidth ?? 1200
      const gap = GAP_REM * rootFontSize
      const colWidth = (vw - gap * (columns + 1)) / columns
      return colWidth + gap
    },
    overscan: 8,
  })

  const handleScrollToDate = useCallback((date: string) => {
    const idx = dateIndexMap.get(date)
    if (idx !== undefined) {
      rowVirtualizer.scrollToIndex(idx, { align: 'start' })
    }
  }, [dateIndexMap, rowVirtualizer])

  useEffect(() => {
    scrollToRef.current = handleScrollToDate
  }, [handleScrollToDate, scrollToRef])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let rafId = 0
    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const visibleRows = rowVirtualizer.getVirtualItems()
        const scrollTop = el.scrollTop
        for (let i = visibleRows.length - 1; i >= 0; i--) {
          const vr = visibleRows[i]
          const item = virtualItems[vr.index]
          if (item?.type === 'header' && vr.start <= scrollTop + 1) {
            setStickyHeader({ label: item.label, count: item.count })
            return
          }
        }
        setStickyHeader(null)
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(rafId)
      el.removeEventListener('scroll', onScroll)
    }
  }, [virtualItems, rowVirtualizer])

  const handleSingleClick = useCallback((index: number) => {
    setLightboxIndex(index)
  }, [])

  const handleDoubleClick = useCallback((photoId: string) => {
    const params = new URLSearchParams({ startId: photoId })
    if (subfolderFilter) params.set('subfolder', subfolderFilter)
    navigate(`/review?${params}`)
  }, [navigate, subfolderFilter])

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <NavBar />
      <GridToolbar />

      <div className="flex-1 min-h-0 flex">
        <FolderSidebar />

        <div
          ref={scrollRef}
          data-testid="grid-scroll-container"
          className="flex-1 min-h-0 overflow-y-auto"
        >
          {stickyHeader && (
            <div className="sticky top-0 z-10 backdrop-blur-xl bg-glass border-b border-border-subtle px-4 py-2 flex items-center gap-3">
              <span className="text-body font-semibold text-text">{stickyHeader.label}</span>
              <div className="flex-1 h-px bg-border-subtle" />
              <span className="text-micro text-text-tertiary tabular-nums">{stickyHeader.count} 张</span>
            </div>
          )}

          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const item = virtualItems[virtualRow.index]
              if (!item) return null

              if (item.type === 'header') {
                return (
                  <div
                    key={`h-${virtualRow.index}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="flex items-end px-4 pb-2 pt-6"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span className="text-text text-body font-semibold whitespace-nowrap">
                        {item.label}
                      </span>
                      <div className="flex-1 h-px bg-border-subtle" />
                      <span className="text-text-tertiary text-micro tabular-nums">
                        {item.count} 张
                      </span>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={`r-${virtualRow.index}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="flex gap-1 px-4"
                >
                  {item.photos.map((photo) => {
                    const photoIndex = photoIndexMap.get(photo.id)!
                    return (
                      <div
                        key={photo.id}
                        className="relative group cursor-pointer rounded-sm overflow-hidden"
                        style={{ width: `calc((100% - ${GAP_REM * (columns + 1)}rem) / ${columns})` }}
                        onClick={() => handleSingleClick(photoIndex)}
                        onDoubleClick={() => handleDoubleClick(photo.id)}
                      >
                        <img
                          src={api.thumbnailUrl(photo.id)}
                          alt={photo.name}
                          loading="lazy"
                          className="w-full aspect-square object-cover bg-bg-elevated transition-opacity duration-normal"
                          style={{ opacity: 0 }}
                          onLoad={e => { (e.target as HTMLImageElement).style.opacity = '1' }}
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        <YearTimeline />
      </div>

      {lightboxIndex >= 0 && (
        <Lightbox
          photos={filteredPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  )
}

function GridInner() {
  const { refresh, loading } = useGrid()

  useEffect(() => { refresh() }, [refresh])

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-bg">
        <NavBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-text-secondary text-caption">加载中...</span>
          </div>
        </div>
      </div>
    )
  }

  return <GridLayout />
}

export default function GridPage() {
  const navigate = useNavigate()
  const { isLoaded } = useApp()

  useEffect(() => {
    if (!isLoaded) navigate('/')
  }, [navigate, isLoaded])

  if (!isLoaded) return null

  return (
    <GridProvider>
      <GridInner />
    </GridProvider>
  )
}
