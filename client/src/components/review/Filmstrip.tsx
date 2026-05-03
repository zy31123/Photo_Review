import { useCallback, useEffect, useRef, memo } from 'react'
import { api, type PhotoGroup } from '../../api'
import { useReview } from '../../context/ReviewContext'

export default function Filmstrip() {
  const { filteredPhotos, currentIndex, goTo } = useReview()
  const scrollRef = useRef<HTMLDivElement>(null)

  const WINDOW = 150

  const start = Math.max(0, currentIndex - WINDOW)
  const end = Math.min(filteredPhotos.length, currentIndex + WINDOW + 1)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const active = el.querySelector('[data-active="true"]')
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [currentIndex])

  const handleGoTo = useCallback((i: number) => goTo(i), [goTo])

  return (
    <div className="h-[72px] bg-bg-deep border-t border-border/30 flex items-center px-4 overflow-hidden">
      <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto scrollbar-thin">
        {start > 0 && (
          <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center text-[10px] text-text-muted">
            ···
          </div>
        )}
        {filteredPhotos.slice(start, end).map((photo, i) => {
          const realIndex = start + i
          return (
            <FilmstripItem
              key={photo.id}
              photo={photo}
              index={realIndex}
              active={realIndex === currentIndex}
              onSelect={handleGoTo}
            />
          )
        })}
        {end < filteredPhotos.length && (
          <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center text-[10px] text-text-muted">
            ···
          </div>
        )}
      </div>
    </div>
  )
}

const FilmstripItem = memo(function FilmstripItem({
  photo, index, active, onSelect,
}: {
  photo: PhotoGroup
  index: number
  active: boolean
  onSelect: (i: number) => void
}) {
  const reviewed = !!photo.reviewAction
  return (
    <button
      data-active={active}
      onClick={() => onSelect(index)}
      className={`relative flex-shrink-0 w-14 h-14 rounded overflow-hidden transition-all duration-150 ${
        active
          ? 'border-2 border-accent scale-105 z-10 filmstrip-item-active'
          : reviewed
            ? 'border-2 border-transparent opacity-40 hover:opacity-70'
            : 'border-2 border-transparent opacity-50 hover:opacity-80'
      }`}
    >
      <img src={api.thumbnailUrl(photo.id)} alt="" className="w-full h-full object-cover" loading="lazy" />
      {reviewed && !active && (
        <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-black/30" />
      )}
    </button>
  )
})
