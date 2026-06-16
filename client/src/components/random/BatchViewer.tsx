import { useRef, useEffect } from 'react'
import { api, type PhotoGroup } from '../../api'
import { useImageZoom } from '../../hooks/useImageZoom'
import { useDragImage } from '../../hooks/useDragImage'
import RandomControls from './RandomControls'

interface BatchViewerProps {
  photo: PhotoGroup
  batchReviewed: number
  batchTotal: number
  canGoPrev: boolean
  canGoNext: boolean
  rating: number
  favorite: boolean
  onPrev: () => void
  onNext: () => void
  onSkip: () => void
  onKeep: () => void
  onDelete: () => void
  onRating: (rating: number) => void
  onFavorite: () => void
}

export default function BatchViewer({
  photo, batchReviewed, batchTotal, canGoPrev, canGoNext,
  rating, favorite, onPrev, onNext, onSkip, onKeep, onDelete, onRating, onFavorite,
}: BatchViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { resetZoom, zoomStyle, handleWheel: zoomWheel, handlers: zoomHandlers } = useImageZoom()
  const drag = useDragImage(photo)

  useEffect(() => { resetZoom() }, [photo.id, resetZoom])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', zoomWheel, { passive: false })
    return () => el.removeEventListener('wheel', zoomWheel)
  }, [zoomWheel])

  return (
    <div
      ref={containerRef}
      className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#1D1D1F]"
    >
      <img
        key={photo.id}
        src={api.fullUrl(photo.id)}
        alt={photo.name}
        className="max-h-full max-w-full object-contain rounded-md"
        style={{ ...zoomStyle, transformOrigin: '0 0' }}
        {...drag}
        onMouseDown={zoomHandlers.onMouseDown}
        onMouseMove={zoomHandlers.onMouseMove}
        onMouseUp={zoomHandlers.onMouseUp}
        onMouseLeave={zoomHandlers.onMouseLeave}
        onDoubleClick={zoomHandlers.onDoubleClick}
      />
      <RandomControls
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        rating={rating}
        favorite={favorite}
        onPrev={onPrev}
        onNext={onNext}
        onSkip={onSkip}
        onKeep={onKeep}
        onDelete={onDelete}
        onRating={onRating}
        onFavorite={onFavorite}
      />
      {batchTotal > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-accent/80 transition-all duration-slow"
            style={{ width: `${(batchReviewed / batchTotal) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
