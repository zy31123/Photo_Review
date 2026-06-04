import { Star, Trash2, Check } from 'lucide-react'
import { api, type SimilarGroup } from '../../api'
import { useSimilar } from '../../context/SimilarContext'

export default function ClusterCard({ group }: { group: SimilarGroup }) {
  const { selections, toggleSelection, keepRecommended } = useSimilar()
  const groupSel = selections.get(group.id)

  const deleteCount = groupSel
    ? Array.from(groupSel.values()).filter(s => s === 'delete').length
    : 0

  return (
    <div className="bg-bg-card rounded-lg border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
        <span className="text-text-heading text-sm font-medium">
          {group.photos.length} 张相似
        </span>
        <span className="text-text-muted text-xs">
          平均距离 {group.avgDistance}
        </span>
        <button
          onClick={() => keepRecommended(group.id)}
          className="ml-auto text-xs text-text-muted hover:text-accent transition-colors flex items-center gap-1"
        >
          <Star className="size-3" />
          仅保留推荐
        </button>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-1.5 p-3 overflow-x-auto">
        {group.photos.map((photo, idx) => {
          const isSelected = groupSel?.get(photo.id) === 'delete'
          const isRecommended = idx === group.coverIndex

          return (
            <div
              key={photo.id}
              className="relative flex-shrink-0 cursor-pointer group/thumb"
              onClick={() => toggleSelection(group.id, photo.id)}
            >
              <img
                src={api.thumbnailUrl(photo.id)}
                alt={photo.name}
                loading="lazy"
                className="w-24 h-24 object-cover rounded-md transition-all duration-150"
                style={{
                  opacity: isSelected ? 0.4 : 1,
                  outline: isSelected ? '2px solid rgb(239 68 68)' : isRecommended ? '2px solid rgb(59 130 246)' : 'none',
                  outlineOffset: '-1px',
                }}
              />

              {/* Recommended badge */}
              {isRecommended && (
                <div className="absolute top-0.5 left-0.5 bg-blue-500 text-white rounded-sm px-1 py-px text-[10px] font-bold flex items-center gap-0.5">
                  <Star className="size-2.5" />
                  推荐
                </div>
              )}

              {/* Delete indicator */}
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-red-500/80 rounded-full p-1">
                    <Trash2 className="size-4 text-white" />
                  </div>
                </div>
              )}

              {/* Keep indicator */}
              {!isSelected && !isRecommended && groupSel?.get(photo.id) === null && (
                <div className="absolute bottom-0.5 right-0.5 bg-bg/70 rounded-sm opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                  <Check className="size-3 text-text-muted" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {deleteCount > 0 && (
        <div className="px-3 py-2 border-t border-border/30 text-xs text-text-muted">
          将删除 {deleteCount} 张，保留 {group.photos.length - deleteCount} 张
        </div>
      )}
    </div>
  )
}
