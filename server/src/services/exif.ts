import exifr from 'exifr'
import fs from 'fs'
import { type PhotoGroup } from './scanner.js'

export interface ExifData {
  camera: string
  lens: string
  focalLength: string
  aperture: string
  shutterSpeed: string
  iso: string
  width: number
  height: number
  dateTime: string
  fileSize: string
}

export async function extractExif(photo: PhotoGroup): Promise<ExifData | null> {
  const sourcePath = photo.jpgPath || photo.rawPaths[0]
  if (!sourcePath || !fs.existsSync(sourcePath)) return null

  try {
    const buf = fs.readFileSync(sourcePath)
    const data = await exifr.parse(buf, {
      pick: [
        'Make', 'Model', 'LensModel',
        'FocalLength', 'FNumber', 'ExposureTime', 'ISO',
        'ExifImageWidth', 'ExifImageHeight', 'ImageWidth', 'ImageHeight',
        'DateTimeOriginal', 'CreateDate',
      ],
    })

    if (!data) return null

    const make = data.Make || ''
    const model = data.Model || ''
    const camera = [make, model.replace(make, '')].filter(Boolean).join(' ').trim() || model || '—'

    const focalLength = data.FocalLength ? `${Math.round(data.FocalLength)}mm` : '—'

    const aperture = data.FNumber ? `f/${data.FNumber}` : '—'

    const shutterSpeed = data.ExposureTime
      ? data.ExposureTime >= 1
        ? `${data.ExposureTime}s`
        : `1/${Math.round(1 / data.ExposureTime)}s`
      : '—'

    const iso = data.ISO ? `ISO ${data.ISO}` : '—'

    const width = data.ExifImageWidth || data.ImageWidth || 0
    const height = data.ExifImageHeight || data.ImageHeight || 0

    const dateTime = data.DateTimeOriginal || data.CreateDate || null
    const dateTimeStr = dateTime
      ? `${dateTime.getFullYear()}-${String(dateTime.getMonth() + 1).padStart(2, '0')}-${String(dateTime.getDate()).padStart(2, '0')} ${String(dateTime.getHours()).padStart(2, '0')}:${String(dateTime.getMinutes()).padStart(2, '0')}:${String(dateTime.getSeconds()).padStart(2, '0')}`
      : '—'

    let jpgSize = 0
    let rawSize = 0
    if (photo.jpgPath) {
      try { jpgSize = fs.statSync(photo.jpgPath).size } catch {}
    }
    for (const rp of photo.rawPaths) {
      try { rawSize += fs.statSync(rp).size } catch {}
    }
    const totalSize = jpgSize + rawSize

    return {
      camera,
      lens: data.LensModel || '—',
      focalLength,
      aperture,
      shutterSpeed,
      iso,
      width,
      height,
      dateTime: dateTimeStr,
      fileSize: formatSize(totalSize) + (jpgSize > 0 && rawSize > 0 ? ` (JPG ${formatSize(jpgSize)} + RAW ${formatSize(rawSize)})` : ''),
    }
  } catch {
    return null
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
