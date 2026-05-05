import { useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { PhotoGroup } from '../../api'

interface LightboxProps {
  photos: PhotoGroup[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export default function Lightbox({ photos, currentIndex, onClose, onNavigate }: LightboxProps) {
  const photo = photos[currentIndex]
  const canPrev = currentIndex > 0
  const canNext = currentIndex < photos.length - 1

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowLeft' && canPrev) onNavigate(currentIndex - 1)
    else if (e.key === 'ArrowRight' && canNext) onNavigate(currentIndex + 1)
  }, [onClose, onNavigate, canPrev, canNext, currentIndex])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 w-12 h-12 rounded-full bg-bg-card/80 text-text-secondary hover:text-text flex items-center justify-center transition-colors z-10"
      >
        <X className="size-5" />
      </button>

      {canPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1) }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-bg-card/80 text-text-secondary hover:text-text flex items-center justify-center transition-colors z-10"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {canNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1) }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-bg-card/80 text-text-secondary hover:text-text flex items-center justify-center transition-colors z-10"
        >
          <ChevronRight className="size-5" />
        </button>
      )}

      <img
        src={`/api/photos/${encodeURIComponent(photo.id)}/full`}
        alt={photo.name}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-2xl"
        onClick={e => e.stopPropagation()}
      />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-text-secondary text-sm font-mono">
        {photo.name}
      </div>
    </div>
  )
}
