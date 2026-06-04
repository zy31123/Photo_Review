import { useState, useCallback, useRef, useEffect } from 'react'
import { api } from '../../api'
import { useReview } from '../../context/ReviewContext'
import { useDragImage } from '../../hooks/useDragImage'
import { useImageZoom } from '../../hooks/useImageZoom'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import ReviewControls from './ReviewControls'

export default function ImageViewport() {
  const { currentPhoto, currentIndex, filteredPhotos, goTo, error } = useReview()
  const [loaded, setLoaded] = useState(false)
  const [hoveringLeft, setHoveringLeft] = useState(false)
  const [hoveringRight, setHoveringRight] = useState(false)
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { resetZoom, zoomStyle, handleWheel: zoomWheel, handlers: zoomHandlers } = useImageZoom()

  const handleImageLoad = useCallback(() => setLoaded(true), [])
  const drag = useDragImage(currentPhoto, handleImageLoad)

  useEffect(() => { resetZoom() }, [currentPhoto?.id, resetZoom])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', zoomWheel, { passive: false })
    return () => el.removeEventListener('wheel', zoomWheel)
  }, [zoomWheel])

  const handlePrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo])
  const handleNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) return
    if (wheelTimerRef.current) return
    if (e.deltaY > 0) {
      goTo(currentIndex + 1)
    } else if (e.deltaY < 0) {
      goTo(currentIndex - 1)
    }
    wheelTimerRef.current = setTimeout(() => {
      wheelTimerRef.current = null
    }, 150)
  }, [currentIndex, goTo])

  if (!currentPhoto) {
    return (
      <div className="relative flex items-center justify-center bg-[#1D1D1F] overflow-hidden">
        <div className="flex flex-col items-center gap-3 text-white/30">
          <ImageIcon className="size-12" strokeWidth={1} />
          <span className="text-caption">选择一张照片开始审阅</span>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative flex items-center justify-center bg-[#1D1D1F] overflow-hidden" onWheel={handleWheel}>
      {/* Prev overlay */}
      <div
        className="absolute left-0 top-0 bottom-0 w-24 z-10 flex items-center justify-start pl-4 cursor-pointer opacity-0 hover:opacity-100 transition-opacity duration-fast"
        onClick={handlePrev}
        onMouseEnter={() => setHoveringLeft(true)}
        onMouseLeave={() => setHoveringLeft(false)}
      >
        {hoveringLeft && currentIndex > 0 && (
          <div className="w-10 h-10 rounded-md bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <ChevronLeft className="size-5 text-white/70" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Main image */}
      <img
        key={currentPhoto.id}
        src={api.fullUrl(currentPhoto.id)}
        alt={currentPhoto.name}
        {...drag}
        style={{ ...zoomStyle, transformOrigin: '0 0' }}
        onMouseDown={zoomHandlers.onMouseDown}
        onMouseMove={zoomHandlers.onMouseMove}
        onMouseUp={zoomHandlers.onMouseUp}
        onMouseLeave={zoomHandlers.onMouseLeave}
        onDoubleClick={zoomHandlers.onDoubleClick}
        className={`max-h-full max-w-full object-contain rounded-md transition-opacity duration-normal ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Next overlay */}
      <div
        className="absolute right-0 top-0 bottom-0 w-24 z-10 flex items-center justify-end pr-4 cursor-pointer opacity-0 hover:opacity-100 transition-opacity duration-fast"
        onClick={handleNext}
        onMouseEnter={() => setHoveringRight(true)}
        onMouseLeave={() => setHoveringRight(false)}
      >
        {hoveringRight && currentIndex < filteredPhotos.length - 1 && (
          <div className="w-10 h-10 rounded-md bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <ChevronRight className="size-5 text-white/70" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Controls overlay */}
      <ReviewControls />

      {/* Error toast */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-md bg-danger/20 border border-danger/30 text-danger text-caption backdrop-blur-sm">
          {error}
        </div>
      )}
    </div>
  )
}
