import { Star, Heart, ChevronLeft, X, Check, RefreshCw, ChevronRight } from 'lucide-react'
import ActionBtn from '../ui/ActionBtn'
import Tooltip from '../ui/Tooltip'

interface RandomControlsProps {
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

export default function RandomControls({
  canGoPrev, canGoNext, rating, favorite,
  onPrev, onNext, onSkip, onKeep, onDelete, onRating, onFavorite,
}: RandomControlsProps) {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-3 bg-[#1D1D1F]/90 backdrop-blur-2xl rounded-2xl px-4 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <ActionBtn onClick={onPrev} disabled={!canGoPrev} label="上一张" shortcut="←" icon={ChevronLeft} />
        <div className="w-px h-5 bg-white/10" />
        <Tooltip label="评分" shortcut="1-5">
          <div className="flex items-center gap-0.5 px-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => onRating(star === rating ? 0 : star)}
                className="transition-colors duration-fast hover:scale-110"
              >
                <Star
                  size={14}
                  strokeWidth={1.5}
                  className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-white/25 hover:text-white/40'}
                />
              </button>
            ))}
          </div>
        </Tooltip>
        <ActionBtn
          onClick={onFavorite}
          label={favorite ? '取消收藏' : '收藏'}
          shortcut="F"
        >
          <Heart size={20} strokeWidth={1.5} className={favorite ? 'text-red-400 fill-red-400' : undefined} />
        </ActionBtn>
        <div className="w-px h-5 bg-white/10" />
        <ActionBtn onClick={onDelete} variant="danger" label="废片" shortcut="D" icon={X} />
        <ActionBtn onClick={onKeep} variant="success" label="保留" shortcut="空格" icon={Check} />
        <ActionBtn onClick={onSkip} label="跳过" shortcut="R" icon={RefreshCw} />
        <div className="w-px h-5 bg-white/10" />
        <ActionBtn onClick={onNext} disabled={!canGoNext} label="下一张" shortcut="→" icon={ChevronRight} />
      </div>
    </div>
  )
}
