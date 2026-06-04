import { useReview } from '../../context/ReviewContext'
import { useExif } from '../../hooks/useExif'
import PhotoDetailsView from './PhotoDetailsView'

export default function DetailsPanel() {
  const { currentPhoto, rightPanelOpen } = useReview()
  const exif = useExif(currentPhoto)

  if (!rightPanelOpen || !currentPhoto) return <div />

  return (
    <div className="h-full bg-surface-secondary backdrop-blur-xl border-l border-border-faint overflow-y-auto" style={{ paddingRight: '0.75rem' }}>
      <PhotoDetailsView
        photo={currentPhoto}
        exif={exif}
        reviewed={!!currentPhoto.reviewAction}
      />
    </div>
  )
}
