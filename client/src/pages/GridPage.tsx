import { useEffect, useCallback, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useApp } from '../context/AppContext'
import { GridProvider, useGrid } from '../context/GridContext'
import { api } from '../api'
import NavBar from '../components/NavBar'
import GridToolbar from '../components/grid/GridToolbar'
import GridDateSidebar from '../components/grid/GridDateSidebar'
import Lightbox from '../components/grid/Lightbox'

function GridLayout() {
  const navigate = useNavigate()
  const {
    virtualItems, dateIndexMap, columns, sidebarOpen, filteredPhotos, scrollToRef,
  } = useGrid()

  const scrollRef = useRef<HTMLDivElement>(null)
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  const photoIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    filteredPhotos.forEach((p, i) => map.set(p.id, i))
    return map
  }, [filteredPhotos])

  const HEADER_HEIGHT = 64
  const GAP = 12

  const rowVirtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const item = virtualItems[index]
      if (!item) return 100
      if (item.type === 'header') return HEADER_HEIGHT
      const vw = scrollRef.current?.clientWidth ?? 1200
      const colWidth = (vw - GAP * (columns + 1)) / columns
      return colWidth * 0.75 + GAP + 32
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

  const handleSingleClick = useCallback((index: number) => {
    setLightboxIndex(index)
  }, [])

  const handleDoubleClick = useCallback((photoId: string) => {
    navigate(`/review?startId=${encodeURIComponent(photoId)}`)
  }, [navigate])

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <NavBar />
      <GridToolbar />

      <div className="flex-1 min-h-0 flex">
        <GridDateSidebar />

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto"
        >
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
                    className="flex items-end px-8 pb-4 pt-6 border-b border-border/20"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span className="text-text-heading text-base font-semibold whitespace-nowrap">
                        {item.label}
                      </span>
                      <div className="flex-1 h-px bg-border/40" />
                      <span className="text-text-secondary text-sm tabular-nums">
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
                  className="flex gap-3 px-8"
                >
                  {item.photos.map((photo) => {
                    const photoIndex = photoIndexMap.get(photo.id)!
                    return (
                      <div
                        key={photo.id}
                        className="relative group cursor-pointer overflow-hidden rounded-xl border border-border/20 hover:border-border/40 transition-colors duration-200"
                        style={{ width: `calc((100% - ${GAP * (columns + 1)}px) / ${columns})` }}
                        onClick={() => handleSingleClick(photoIndex)}
                        onDoubleClick={() => handleDoubleClick(photo.id)}
                      >
                        <img
                          src={api.thumbnailUrl(photo.id)}
                          alt={photo.name}
                          loading="lazy"
                          className="w-full aspect-[4/3] object-cover bg-bg-card rounded-xl transition-opacity duration-200"
                          style={{ opacity: 0 }}
                          onLoad={e => { (e.target as HTMLImageElement).style.opacity = '1' }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200 rounded-xl" />
                        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <span className="text-white/90 text-sm truncate block">
                            {photo.name}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
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
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
            </div>
            <span className="text-text-secondary text-sm">加载中...</span>
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
