import { useState, useCallback, useRef } from 'react'
import { api } from '../../api'
import { useReview } from '../../context/ReviewContext'
import ReviewControls from './ReviewControls'

export default function ImageViewport() {
  const { currentPhoto, currentIndex, filteredPhotos, goTo, error } = useReview()
  const [loaded, setLoaded] = useState(false)
  const [hoveringLeft, setHoveringLeft] = useState(false)
  const [hoveringRight, setHoveringRight] = useState(false)
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleImageLoad = useCallback(() => setLoaded(true), [])

  const handlePrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo])
  const handleNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo])

  const handleWheel = useCallback((e: React.WheelEvent) => {
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

  if (!currentPhoto) return null

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
        onLoad={handleImageLoad}
        className={`max-h-full max-w-full object-contain transition-all duration-300 ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]'
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
