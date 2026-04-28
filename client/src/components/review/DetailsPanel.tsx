import { useReview } from '../../context/ReviewContext'
import { useExif } from '../../hooks/useExif'
import PhotoDetailsView from './PhotoDetailsView'

export default function DetailsPanel() {
  const { currentPhoto, rightPanelOpen, reviewedIds } = useReview()
  const exif = useExif(currentPhoto)

  if (!rightPanelOpen || !currentPhoto) return <div />

  return (
    <div className="h-full bg-bg-deep border-l border-border/30 overflow-y-auto" style={{ paddingRight: 12 }}>
      <PhotoDetailsView
        photo={currentPhoto}
        exif={exif}
        reviewed={reviewedIds.has(currentPhoto.id)}
      />
    </div>
  )
}
