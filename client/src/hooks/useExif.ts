import { useState, useEffect } from 'react'
import { api, type PhotoGroup, type ExifData } from '../api'

export function useExif(photo: PhotoGroup | null): ExifData | null {
  const [exif, setExif] = useState<ExifData | null>(null)

  useEffect(() => {
    if (!photo) { setExif(null); return }
    let cancelled = false
    api.getExif(photo.id).then(data => {
      if (!cancelled) setExif(data)
    })
    return () => { cancelled = true }
  }, [photo])

  return exif
}
