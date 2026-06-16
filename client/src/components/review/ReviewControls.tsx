import { useReview } from '../../context/ReviewContext'
import { useApp } from '../../context/AppContext'
import PhotoActionBar from '../shared/PhotoActionBar'

interface ReviewControlsProps {
  onActionFeedback?: (feedback: 'keep' | 'delete' | null) => void
}

export default function ReviewControls({ onActionFeedback }: ReviewControlsProps) {
  const { currentIndex, filteredPhotos, currentPhoto, goTo, handleAction } = useReview()
  const { updatePhotoRating, updatePhotoFavorite } = useApp()

  return (
    <PhotoActionBar
      canGoPrev={currentIndex > 0}
      canGoNext={currentIndex < filteredPhotos.length - 1}
      rating={currentPhoto?.rating ?? 0}
      favorite={currentPhoto?.favorite ?? false}
      onPrev={() => goTo(currentIndex - 1)}
      onNext={() => goTo(currentIndex + 1)}
      onDelete={() => { handleAction('deleted'); onActionFeedback?.('delete') }}
      onKeep={() => { handleAction('keep'); onActionFeedback?.('keep') }}
      onRating={r => updatePhotoRating(currentPhoto!.id, r)}
      onFavorite={() => updatePhotoFavorite(currentPhoto!.id)}
    />
  )
}
