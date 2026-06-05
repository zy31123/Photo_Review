import { Heart, ChevronLeft, X, Check, ChevronRight } from 'lucide-react'
import { useReview } from '../../context/ReviewContext'
import { useApp } from '../../context/AppContext'
import ActionBtn from '../ui/ActionBtn'
import RatingStars from '../ui/RatingStars'
import Tooltip from '../ui/Tooltip'

interface ReviewControlsProps {
  onActionFeedback?: (feedback: 'keep' | 'delete' | null) => void
}

export default function ReviewControls({ onActionFeedback }: ReviewControlsProps) {
  const { currentIndex, filteredPhotos, currentPhoto, goTo, handleAction } = useReview()
  const { updatePhotoRating, updatePhotoFavorite } = useApp()

  const rating = currentPhoto?.rating ?? 0
  const favorite = currentPhoto?.favorite ?? false

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-3 bg-[#1D1D1F]/90 backdrop-blur-2xl rounded-2xl px-4 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <ActionBtn
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          label="上一张"
          shortcut="←"
          icon={ChevronLeft}
        />
        <div className="w-px h-5 bg-white/10" />
        <Tooltip label="评分" shortcut="1-5">
          <div className="px-1">
            <RatingStars
              rating={rating}
              onChange={r => updatePhotoRating(currentPhoto!.id, r)}
              size={14}
            />
          </div>
        </Tooltip>
        <ActionBtn
          onClick={() => updatePhotoFavorite(currentPhoto!.id)}
          label={favorite ? '取消收藏' : '收藏'}
          shortcut="F"
        >
          <Heart
            size={20}
            strokeWidth={1.5}
            className={favorite ? 'text-red-400 fill-red-400' : undefined}
          />
        </ActionBtn>
        <div className="w-px h-5 bg-white/10" />
        <ActionBtn
          onClick={() => {
            handleAction('deleted')
            onActionFeedback?.('delete')
          }}
          variant="danger"
          label="废片"
          shortcut="D"
          icon={X}
        />
        <ActionBtn
          onClick={() => {
            handleAction('keep')
            onActionFeedback?.('keep')
          }}
          variant="success"
          label="保留"
          shortcut="空格"
          icon={Check}
        />
        <div className="w-px h-5 bg-white/10" />
        <ActionBtn
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex >= filteredPhotos.length - 1}
          label="下一张"
          shortcut="→"
          icon={ChevronRight}
        />
      </div>
    </div>
  )
}
