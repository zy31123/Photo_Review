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
    <div className="bg-bg-elevated rounded-md border border-border-subtle overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
        <span className="text-text text-caption font-medium">
          {group.photos.length} 张相似
        </span>
        <span className="text-text-tertiary text-micro">
          平均距离 {group.avgDistance}
        </span>
        <button
          onClick={() => keepRecommended(group.id)}
          className="ml-auto text-micro text-text-tertiary hover:text-accent transition-colors duration-fast flex items-center gap-1"
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
                className="w-22 h-22 object-cover rounded-sm transition-opacity duration-fast"
                style={{
                  opacity: isSelected ? 0.4 : 1,
                  outline: isSelected ? '2px solid rgb(239 68 68)' : isRecommended ? '2px solid rgb(0 122 255)' : 'none',
                  outlineOffset: '-1px',
                }}
              />

              {/* Recommended badge */}
              {isRecommended && (
                <div className="absolute top-0.5 left-0.5 bg-accent text-white rounded-sm px-1 py-px text-[10px] font-bold flex items-center gap-0.5">
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
