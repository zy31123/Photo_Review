import fs from 'fs'
import exifr from 'exifr'
import type { PhotoGroup } from '@photo-review/shared'
import { getPrimaryPath } from '../utils/path.js'
import { getCachedExif, setCachedExif } from '../cache/exifCache.js'

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
  // Check cache first
  const cached = getCachedExif(photo.id)
  if (cached) return cached

  const sourcePath = getPrimaryPath(photo)
  if (!sourcePath) return null

  try {
    // Read only first 256KB for EXIF extraction (EXIF data is in file header)
    const handle = await fs.promises.open(sourcePath, 'r')
    try {
      const buf = Buffer.alloc(256 * 1024)
      await handle.read(buf, 0, buf.length, 0)

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

      const [jpgSize, rawSize] = await Promise.all([
        photo.jpgPath
          ? fs.promises.stat(photo.jpgPath).then(s => s.size).catch(() => 0)
          : Promise.resolve(0),
        Promise.all(photo.rawPaths.map(rp =>
          fs.promises.stat(rp).then(s => s.size).catch(() => 0)
        )).then(sizes => sizes.reduce((a, b) => a + b, 0)),
      ])
      const totalSize = jpgSize + rawSize

      const result: ExifData = {
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

      setCachedExif(photo.id, result)
      return result
    } finally {
      await handle.close()
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
