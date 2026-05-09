import { useRef, useCallback } from 'react'
import { api, type PhotoGroup } from '../api'

export function useDragImage(
  photo: PhotoGroup | null,
  externalOnLoad?: () => void,
) {
  const blobRef = useRef<Blob | null>(null)

  const url = photo ? api.fullUrl(photo.id) : null

  const onLoad = useCallback(() => {
    externalOnLoad?.()
    if (!url) return
    fetch(url)
      .then(r => r.blob())
      .then(blob => { blobRef.current = blob })
      .catch(() => {})
  }, [url, externalOnLoad])

  const onDragStart = useCallback((e: React.DragEvent<HTMLImageElement>) => {
    const blob = blobRef.current
    if (!blob || !photo) return

    const file = new File([blob], photo.name, { type: 'image/jpeg' })
    e.dataTransfer.items.add(file)

    const absUrl = new URL(url!, window.location.origin).href
    e.dataTransfer.setData('DownloadURL', `image/jpeg:${photo.name}:${absUrl}`)
  }, [photo, url])

  const onDragEnd = useCallback(() => {
    blobRef.current = null
  }, [])

  if (!photo) {
    return { onLoad: externalOnLoad }
  }

  return {
    draggable: true as const,
    onLoad,
    onDragStart,
    onDragEnd,
  }
}
