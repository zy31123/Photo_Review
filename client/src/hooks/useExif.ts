import { useState, useEffect } from 'react'
import { api, type PhotoGroup, type ExifData } from '../api'

export function useExif(photo: PhotoGroup | null): ExifData | null {
  const [exif, setExif] = useState<ExifData | null>(null)
  const photoId = photo?.id ?? null

  useEffect(() => {
    if (!photoId) { setExif(null); return }
    let cancelled = false
    api.getExif(photoId).then(data => {
      if (!cancelled) setExif(data)
    })
    return () => { cancelled = true }
  }, [photoId])

  return exif
}
