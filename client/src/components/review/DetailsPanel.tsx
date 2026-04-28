import { useState, useEffect } from 'react'
import { api, type ExifData } from '../../api'
import { useReview } from '../../context/ReviewContext'
import PhotoDetailsView from './PhotoDetailsView'

export default function DetailsPanel() {
  const { currentPhoto, rightPanelOpen, reviewedIds } = useReview()
  const [exif, setExif] = useState<ExifData | null>(null)

  useEffect(() => {
    if (!currentPhoto) { setExif(null); return }
    let cancelled = false
    api.getExif(currentPhoto.id).then(data => {
      if (!cancelled) setExif(data)
    })
    return () => { cancelled = true }
  }, [currentPhoto])

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
