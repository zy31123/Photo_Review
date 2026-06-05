import { useEffect, useCallback, useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, X, Columns2, Trash2, Star } from 'lucide-react'
import { api } from '../../api'
import { useSimilar } from '../../context/SimilarContext'

const overlayBtn = 'w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white/70 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all duration-200'

export default function ClusterLightbox() {
  const {
    groups, selections, lightbox,
    closeLightbox, navigateLightbox, toggleCompareMode,
    setCompareIndex, toggleSelection, directDelete,
  } = useSimilar()

  const { open, groupId, currentIndex, compareMode, compareIndex } = lightbox
  const group = groups.find(g => g.id === groupId)

  // Confirmation state for direct delete
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Reset confirm when photo changes
  useEffect(() => { setConfirmDelete(null) }, [currentIndex])

  // Close lightbox if group was removed
  useEffect(() => {
    if (open && groupId && !groups.find(g => g.id === groupId)) {
      closeLightbox()
    }
  }, [groups, groupId, open, closeLightbox])

  const photo = group?.photos[currentIndex]
  const comparePhoto = compareMode && compareIndex !== null ? group?.photos[compareIndex] : null
  const canPrev = currentIndex > 0
  const canNext = group ? currentIndex < group.photos.length - 1 : false

  const handleDelete = useCallback((photoId: string) => {
    if (confirmDelete === photoId) {
      clearTimeout(confirmTimerRef.current)
      setConfirmDelete(null)
      directDelete(photoId)
    } else {
      setConfirmDelete(photoId)
      clearTimeout(confirmTimerRef.current)
      confirmTimerRef.current = setTimeout(() => setConfirmDelete(null), 2000)
    }
  }, [confirmDelete, directDelete])

  // Cleanup timer
  useEffect(() => () => clearTimeout(confirmTimerRef.current), [])

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      compareMode ? toggleCompareMode() : closeLightbox()
    } else if (e.key === 'ArrowLeft' && canPrev) {
      navigateLightbox(currentIndex - 1)
    } else if (e.key === 'ArrowRight' && canNext) {
      navigateLightbox(currentIndex + 1)
    } else if (e.key === 'd' || e.key === 'D') {
      if (photo && group) toggleSelection(group.id, photo.id)
    } else if (e.key === 'Delete' && photo) {
      handleDelete(photo.id)
    } else if (e.key === 'c' || e.key === 'C') {
      toggleCompareMode()
    }
  }, [closeLightbox, navigateLightbox, toggleCompareMode, toggleSelection, handleDelete, canPrev, canNext, currentIndex, photo, group, compareMode])

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, handleKey])

  if (!open || !group || group.photos.length === 0) return null

  const groupSel = selections.get(group.id)
  const isMarkedDelete = photo ? groupSel?.get(photo.id) === 'delete' : false

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col"
      onClick={closeLightbox}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-14 shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={closeLightbox} className={overlayBtn}>
          <X className="size-5" />
        </button>

        {photo && (
          <span className="text-white/60 text-sm truncate max-w-[200px]">
            {photo.name}
          </span>
        )}
        <span className="text-white/40 text-sm tabular-nums">
          {currentIndex + 1} / {group.photos.length}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleCompareMode}
            className={`${overlayBtn} ${compareMode ? '!bg-white/20 !text-white' : ''}`}
            title="对比模式 (C)"
          >
            <Columns2 className="size-4" />
          </button>
          <button
            onClick={() => { if (photo && group) toggleSelection(group.id, photo.id) }}
            className={`${overlayBtn} ${isMarkedDelete ? '!bg-red-500/30 !text-red-400' : ''}`}
            title="标记删除 (D)"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            onClick={() => { if (photo) handleDelete(photo.id) }}
            className={`relative ${overlayBtn} ${confirmDelete === photo?.id ? '!bg-red-500/50 !text-white animate-pulse' : 'hover:!bg-red-500/20 hover:!text-red-400'}`}
            title="直接删除 (Delete)"
          >
            <Trash2 className="size-4" />
            {confirmDelete === photo?.id && <span className="absolute text-[9px] font-bold">!</span>}
          </button>
        </div>
      </div>

      {/* Center — image(s) */}
      <div
        className="flex-1 flex items-center justify-center relative min-h-0"
        onClick={e => e.stopPropagation()}
      >
        {canPrev && (
          <button
            onClick={() => navigateLightbox(currentIndex - 1)}
            className={`absolute left-4 top-1/2 -translate-y-1/2 ${overlayBtn}`}
          >
            <ChevronLeft className="size-6" />
          </button>
        )}

        {canNext && (
          <button
            onClick={() => navigateLightbox(currentIndex + 1)}
            className={`absolute right-4 top-1/2 -translate-y-1/2 ${overlayBtn}`}
          >
            <ChevronRight className="size-6" />
          </button>
        )}

        {compareMode && comparePhoto ? (
          <div className="flex items-center justify-center gap-2 w-full h-full px-16">
            <div className="flex-1 flex items-center justify-center h-full min-w-0">
              <img
                src={api.fullUrl(photo!.id)}
                alt={photo!.name}
                className="max-h-full max-w-full object-contain rounded-md"
              />
            </div>
            <div className="w-px h-3/4 bg-white/10" />
            <div className="flex-1 flex items-center justify-center h-full min-w-0">
              <img
                src={api.fullUrl(comparePhoto.id)}
                alt={comparePhoto.name}
                className="max-h-full max-w-full object-contain rounded-md"
              />
            </div>
          </div>
        ) : photo ? (
          <img
            src={api.fullUrl(photo.id)}
            alt={photo.name}
            className="max-h-full max-w-[90vw] object-contain rounded-md"
          />
        ) : null}
      </div>

      {/* Bottom thumbnail strip */}
      <div
        className="shrink-0 px-4 py-3 flex items-center justify-center gap-1.5 overflow-x-auto"
        onClick={e => e.stopPropagation()}
      >
        {group.photos.map((p, idx) => {
          const isCurrent = idx === currentIndex
          const isCompare = idx === compareIndex
          const isRecommended = idx === group.coverIndex
          const isMarked = groupSel?.get(p.id) === 'delete'

          return (
            <button
              key={p.id}
              onClick={() => {
                if (compareMode) {
                  if (idx !== currentIndex) setCompareIndex(idx)
                } else {
                  navigateLightbox(idx)
                }
              }}
              className="relative flex-shrink-0 group/thumb"
            >
              <img
                src={api.thumbnailUrl(p.id)}
                alt={p.name}
                loading="lazy"
                className="w-16 h-16 object-cover rounded-md transition-all duration-150"
                style={{
                  opacity: isMarked ? 0.4 : 1,
                  outline: isCurrent ? '2px solid rgb(0 122 255)' : isCompare ? '2px solid rgb(255 159 10)' : isMarked ? '2px solid rgb(239 68 68)' : 'none',
                  outlineOffset: '-1px',
                }}
              />
              {isRecommended && (
                <div className="absolute top-0.5 left-0.5">
                  <Star className="size-2.5 text-yellow-400 fill-yellow-400" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
