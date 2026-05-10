import { useRef, useCallback } from 'react'
import { api, type PhotoGroup } from '../api'

export function useDragImage(
  photo: PhotoGroup | null,
  externalOnLoad?: () => void,
) {
  const blobRef = useRef<Blob | null>(null)
  const imgElRef = useRef<HTMLImageElement | null>(null)

  const onDragStart = useCallback(async (e: React.DragEvent<HTMLImageElement>) => {
    if (!photo) return

    let blob = blobRef.current
    if (!blob && imgElRef.current) {
      try {
        const canvas = document.createElement('canvas')
        const img = imgElRef.current
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg')
          })
          blobRef.current = blob
        }
      } catch { /* fallback below */ }
    }

    if (blob) {
      const file = new File([blob], photo.name, { type: 'image/jpeg' })
      e.dataTransfer.items.add(file)
    }

    const url = api.fullUrl(photo.id)
    const absUrl = new URL(url, window.location.origin).href
    e.dataTransfer.setData('DownloadURL', `image/jpeg:${photo.name}:${absUrl}`)
  }, [photo])

  return !photo
    ? { onLoad: externalOnLoad }
    : {
        draggable: true as const,
        onLoad: externalOnLoad,
        ref: imgElRef,
        onDragStart,
      }
}
