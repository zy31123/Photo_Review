import { useState, useCallback, useRef, useEffect } from 'react'
import { api } from '../../api'
import { useReview } from '../../context/ReviewContext'
import { useDragImage } from '../../hooks/useDragImage'
import { useImageZoom } from '../../hooks/useImageZoom'
import ReviewControls from './ReviewControls'

export default function ImageViewport() {
  const { currentPhoto, currentIndex, filteredPhotos, goTo, error } = useReview()
  const [loaded, setLoaded] = useState(false)
  const [hoveringLeft, setHoveringLeft] = useState(false)
  const [hoveringRight, setHoveringRight] = useState(false)
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { resetZoom, zoomStyle, handlers: zoomHandlers } = useImageZoom()

  const handleImageLoad = useCallback(() => setLoaded(true), [])
  const drag = useDragImage(currentPhoto, handleImageLoad)

  useEffect(() => { resetZoom() }, [currentPhoto?.id, resetZoom])

  const handlePrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo])
  const handleNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (zoomHandlers.onWheel(e)) return
    if (wheelTimerRef.current) return
    if (e.deltaY > 0) {
      goTo(currentIndex + 1)
    } else if (e.deltaY < 0) {
      goTo(currentIndex - 1)
    }
    wheelTimerRef.current = setTimeout(() => {
      wheelTimerRef.current = null
    }, 150)
  }, [currentIndex, goTo, zoomHandlers])

  if (!currentPhoto) {
    return (
      <div className="image-viewport relative flex items-center justify-center bg-bg overflow-hidden">
        <div className="flex flex-col items-center gap-4 text-text-muted">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm">选择一张照片开始审阅</span>
        </div>
      </div>
    )
  }

  return (
    <div className="image-viewport relative flex items-center justify-center bg-bg overflow-hidden" onWheel={handleWheel}>
      {/* Prev overlay */}
      <div
        className="absolute left-0 top-0 bottom-0 w-24 z-10 flex items-center justify-start pl-4 cursor-pointer opacity-0 hover:opacity-100 transition-opacity duration-200"
        onClick={handlePrev}
        onMouseEnter={() => setHoveringLeft(true)}
        onMouseLeave={() => setHoveringLeft(false)}
      >
        {hoveringLeft && currentIndex > 0 && (
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
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
        className={`max-h-full max-w-full object-contain transition-opacity duration-300 ease-out ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Next overlay */}
      <div
        className="absolute right-0 top-0 bottom-0 w-24 z-10 flex items-center justify-end pr-4 cursor-pointer opacity-0 hover:opacity-100 transition-opacity duration-200"
        onClick={handleNext}
        onMouseEnter={() => setHoveringRight(true)}
        onMouseLeave={() => setHoveringRight(false)}
      >
        {hoveringRight && currentIndex < filteredPhotos.length - 1 && (
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Controls overlay */}
      <ReviewControls />

      {/* Error toast */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-danger/20 border border-danger/40 text-danger text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
