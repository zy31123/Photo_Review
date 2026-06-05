import { useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { PhotoGroup } from '../../api'

interface LightboxProps {
  photos: PhotoGroup[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

const overlayBtn = 'w-14 h-14 rounded-full bg-white/10 backdrop-blur-md text-white/70 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all duration-fast z-10'

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
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className={`absolute top-5 right-5 ${overlayBtn}`}
      >
        <X className="size-6" />
      </button>

      {canPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1) }}
          className={`absolute left-5 top-1/2 -translate-y-1/2 ${overlayBtn}`}
        >
          <ChevronLeft className="size-8" />
        </button>
      )}

      {canNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1) }}
          className={`absolute right-5 top-1/2 -translate-y-1/2 ${overlayBtn}`}
        >
          <ChevronRight className="size-8" />
        </button>
      )}

      <img
        src={`/api/photos/${encodeURIComponent(photo.id)}/full`}
        alt={photo.name}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-md"
        onClick={e => e.stopPropagation()}
      />

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/70 text-caption flex items-center gap-3 bg-black/30 backdrop-blur-md rounded-full px-4 py-2">
        <span>{photo.name}</span>
        <span className="text-white/25">|</span>
        <span className="tabular-nums font-medium">{currentIndex + 1} / {photos.length}</span>
      </div>
    </div>
  )
}
