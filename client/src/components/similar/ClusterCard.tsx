import { Star, Trash2, Check } from 'lucide-react'
import { api, type SimilarGroup } from '../../api'
import { useSimilar } from '../../context/SimilarContext'

export default function ClusterCard({ group, focused }: { group: SimilarGroup; focused?: boolean }) {
  const { selections, openLightbox, keepRecommended, toggleSelection } = useSimilar()
  const groupSel = selections.get(group.id)

  const deleteCount = groupSel
    ? Array.from(groupSel.values()).filter(s => s === 'delete').length
    : 0

  return (
    <div
      className={`bg-bg-elevated rounded-xl shadow-card hover:shadow-card-hover transition-all duration-fast overflow-hidden cursor-pointer ${focused ? 'ring-2 ring-accent' : ''}`}
      onClick={() => openLightbox(group.id)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle">
        <span className="text-text text-body font-semibold">
          {group.photos.length} 张相似
        </span>
        <span className="text-text-tertiary text-micro ml-1">
          距离 {group.avgDistance}
        </span>
        <button
          onClick={e => { e.stopPropagation(); keepRecommended(group.id) }}
          className="ml-auto text-caption text-text-tertiary hover:text-accent transition-colors duration-fast flex items-center gap-1"
        >
          <Star className="size-3" />
          仅保留推荐
        </button>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 p-3 overflow-x-auto">
        {group.photos.map((photo, idx) => {
          const isSelected = groupSel?.get(photo.id) === 'delete'
          const isRecommended = idx === group.coverIndex

          return (
            <div
              key={photo.id}
              className="relative flex-shrink-0"
              onClick={e => { e.stopPropagation(); toggleSelection(group.id, photo.id) }}
            >
              <img
                src={api.thumbnailUrl(photo.id)}
                alt={photo.name}
                loading="lazy"
                className="w-24 h-24 object-cover rounded-md transition-opacity duration-fast"
                style={{
                  opacity: isSelected ? 0.4 : 1,
                  outline: isSelected ? '2px solid rgb(239 68 68)' : isRecommended ? '2px solid rgb(0 122 255)' : 'none',
                  outlineOffset: '-1px',
                }}
              />

              {/* Recommended badge */}
              {isRecommended && (
                <div className="absolute bottom-0 inset-x-0 bg-accent/80 text-white text-center py-0.5 text-[10px] font-bold flex items-center justify-center gap-0.5">
                  <Star className="size-2.5" />
                  推荐
                </div>
              )}

              {/* Delete indicator */}
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-danger/80 rounded-full p-1">
                    <Trash2 className="size-3.5 text-white" />
                  </div>
                </div>
              )}

              {/* Keep indicator */}
              {!isSelected && !isRecommended && groupSel?.get(photo.id) === null && (
                <div className="absolute bottom-0.5 right-0.5 bg-bg/70 rounded-sm opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-fast">
                  <Check className="size-3 text-text-tertiary" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {deleteCount > 0 && (
        <div className="px-3 py-2 border-t border-border-subtle text-micro text-text-tertiary">
          将删除 {deleteCount} 张，保留 {group.photos.length - deleteCount} 张
        </div>
      )}
    </div>
  )
}
