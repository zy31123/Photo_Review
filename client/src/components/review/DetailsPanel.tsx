import { useState, useEffect } from 'react'
import { api, type ExifData } from '../../api'
import { useReview } from '../../context/ReviewContext'
import SectionHeader from '../ui/SectionHeader'

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

  const folderName = currentPhoto.folder ? currentPhoto.folder.split(/[/\\]/).pop() || currentPhoto.folder : ''
  const formattedDate = formatChineseDate(currentPhoto.date)

  return (
    <div className="h-full bg-bg-deep border-l border-border/30 overflow-y-auto" style={{ paddingRight: 12 }}>
      <SectionHeader title="文件信息" />
      <div className="px-5 py-3 space-y-3">
        <MetaRow label="文件名" value={currentPhoto.name} mono />
        <MetaRow label="日期" value={formattedDate} />
        <MetaRow label="文件夹" value={folderName} />
      </div>

      {exif && (
        <>
          <SectionHeader title="拍摄参数" />
          <div className="px-5 py-3 space-y-3">
            <MetaRow label="相机" value={exif.camera} />
            <MetaRow label="镜头" value={exif.lens} />
            <MetaRow label="焦距" value={exif.focalLength} />
            <MetaRow label="光圈" value={exif.aperture} />
            <MetaRow label="快门" value={exif.shutterSpeed} />
            <MetaRow label="ISO" value={exif.iso} />
            <MetaRow label="文件大小" value={exif.fileSize} />
            {(exif.width > 0 && exif.height > 0) && (
              <MetaRow label="分辨率" value={`${exif.width} × ${exif.height}`} />
            )}
            {exif.dateTime !== '—' && (
              <MetaRow label="拍摄时间" value={exif.dateTime} />
            )}
          </div>
        </>
      )}

      <SectionHeader title="文件状态" />
      <div className="px-5 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${currentPhoto.hasJpg ? 'bg-success' : 'bg-danger'}`} />
          <span className={`text-base ${currentPhoto.hasJpg ? 'text-success' : 'text-danger'}`}>
            {currentPhoto.hasJpg ? 'JPG 存在' : 'JPG 缺失'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${currentPhoto.hasRaw ? 'bg-success' : 'bg-danger'}`} />
          <span className={`text-base ${currentPhoto.hasRaw ? 'text-success' : 'text-danger'}`}>
            {currentPhoto.hasRaw ? 'RAW 已配对' : 'RAW 缺失'}
          </span>
        </div>
      </div>

      <SectionHeader title="文件路径" />
      <div className="px-5 py-3 space-y-2">
        {currentPhoto.jpgPath && (
          <div>
            <p className="text-sm text-text-muted mb-0.5">JPG</p>
            <p className="text-sm text-text-secondary font-mono break-all" title={currentPhoto.jpgPath}>
              {currentPhoto.jpgPath}
            </p>
          </div>
        )}
        {currentPhoto.rawPaths.map((p, i) => (
          <div key={i}>
            <p className="text-sm text-text-muted mb-0.5">RAW {currentPhoto.rawPaths.length > 1 ? i + 1 : ''}</p>
            <p className="text-sm text-text-secondary font-mono break-all" title={p}>
              {p}
            </p>
          </div>
        ))}
      </div>

      <SectionHeader title="审阅状态" />
      <div className="px-5 py-3">
        <StatusBadge reviewed={reviewedIds.has(currentPhoto.id)} />
      </div>
    </div>
  )
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-base text-text-muted shrink-0">{label}</span>
      <span className={`text-lg text-text text-right max-w-[220px] break-all ${mono ? 'font-mono' : ''}`} title={value}>
        {value || '—'}
      </span>
    </div>
  )
}

function StatusBadge({ reviewed }: { reviewed: boolean }) {
  if (reviewed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-base text-success">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        已审阅
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-base text-text-muted">
      <span className="w-2 h-2 rounded-full bg-text-muted" />
      未审阅
    </span>
  )
}

function formatChineseDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`
}
