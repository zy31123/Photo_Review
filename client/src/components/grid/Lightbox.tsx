import { useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { PhotoGroup } from '../../api'

interface LightboxProps {
  photos: PhotoGroup[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

const overlayBtn = 'w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm text-white/50 hover:text-white/80 hover:bg-white/30 flex items-center justify-center transition-all z-10'

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
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center transition-colors duration-300"
      onClick={onClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className={`absolute top-4 right-4 ${overlayBtn}`}
      >
        <X className="size-4" />
      </button>

      {canPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1) }}
          className={`absolute left-4 top-1/2 -translate-y-1/2 ${overlayBtn}`}
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {canNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1) }}
          className={`absolute right-4 top-1/2 -translate-y-1/2 ${overlayBtn}`}
        >
          <ChevronRight className="size-5" />
        </button>
      )}

      <img
        src={`/api/photos/${encodeURIComponent(photo.id)}/full`}
        alt={photo.name}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
        onClick={e => e.stopPropagation()}
      />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm flex items-center gap-3">
        <span>{photo.name}</span>
        <span className="text-white/30">|</span>
        <span className="tabular-nums">{currentIndex + 1} / {photos.length}</span>
      </div>
    </div>
  )
}
