import { RefreshCw } from 'lucide-react'
import ActionBtn from '../ui/ActionBtn'
import PhotoActionBar from '../shared/PhotoActionBar'

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
    <PhotoActionBar
      canGoPrev={canGoPrev}
      canGoNext={canGoNext}
      rating={rating}
      favorite={favorite}
      onPrev={onPrev}
      onNext={onNext}
      onDelete={onDelete}
      onKeep={onKeep}
      onRating={onRating}
      onFavorite={onFavorite}
    >
      <ActionBtn onClick={onSkip} label="跳过" shortcut="R" icon={RefreshCw} />
    </PhotoActionBar>
  )
}
