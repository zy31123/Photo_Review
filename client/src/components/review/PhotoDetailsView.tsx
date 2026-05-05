import { Check, X } from 'lucide-react'
import type { PhotoGroup, ExifData } from '../../api'
import { formatChineseDate } from '../../utils/date'
import SectionHeader from '../ui/SectionHeader'

interface PhotoDetailsViewProps {
  photo: PhotoGroup
  exif: ExifData | null
  reviewed?: boolean
}

export default function PhotoDetailsView({ photo, exif, reviewed }: PhotoDetailsViewProps) {
  const folderName = photo.folder ? photo.folder.split(/[/\\]/).pop() || photo.folder : ''
  const formattedDate = formatChineseDate(photo.date)

  return (
    <>
      <SectionHeader title="文件信息" />
      <div className="px-5 py-3 space-y-4">
        <MetaRow label="文件名" value={photo.name} mono />
        <MetaRow label="日期" value={formattedDate} />
        <MetaRow label="文件夹" value={folderName} />
      </div>

      {exif && (
        <>
          <SectionHeader title="拍摄参数" />
          <div className="px-5 py-3 space-y-4">
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
      <div className="px-5 py-3 space-y-3">
        <div className="flex items-center gap-2">
          {photo.hasJpg ? (
            <Check className="w-4 h-4 text-success shrink-0" strokeWidth={2} />
          ) : (
            <X className="w-4 h-4 text-danger shrink-0" strokeWidth={2} />
          )}
          <span className={`text-sm font-medium ${photo.hasJpg ? 'text-success' : 'text-danger'}`}>
            {photo.hasJpg ? 'JPG 存在' : 'JPG 缺失'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {photo.hasRaw ? (
            <Check className="w-4 h-4 text-success shrink-0" strokeWidth={2} />
          ) : (
            <X className="w-4 h-4 text-danger shrink-0" strokeWidth={2} />
          )}
          <span className={`text-sm font-medium ${photo.hasRaw ? 'text-success' : 'text-danger'}`}>
            {photo.hasRaw ? 'RAW 已配对' : 'RAW 缺失'}
          </span>
        </div>
      </div>

      <SectionHeader title="文件路径" />
      <div className="px-5 py-3 space-y-2">
        {photo.jpgPath && (
          <div>
            <p className="text-sm text-text-muted mb-0.5">JPG</p>
            <p className="text-sm text-text-secondary font-mono break-all" title={photo.jpgPath}>
              {photo.jpgPath}
            </p>
          </div>
        )}
        {photo.rawPaths.map((p, i) => (
          <div key={i}>
            <p className="text-sm text-text-muted mb-0.5">RAW {photo.rawPaths.length > 1 ? i + 1 : ''}</p>
            <p className="text-sm text-text-secondary font-mono break-all" title={p}>
              {p}
            </p>
          </div>
        ))}
      </div>

      {reviewed !== undefined && (
        <>
          <SectionHeader title="审阅状态" />
          <div className="px-5 py-3">
            <StatusBadge reviewed={reviewed} />
          </div>
        </>
      )}
    </>
  )
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-sm text-text-muted shrink-0">{label}</span>
      <span className={`text-sm font-medium text-text text-right max-w-[16.25rem] break-all ${mono ? 'font-mono' : ''}`} title={value}>
        {value || '—'}
      </span>
    </div>
  )
}

function StatusBadge({ reviewed }: { reviewed: boolean }) {
  if (reviewed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
        <Check className="w-4 h-4" strokeWidth={2} />
        已审阅
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted">
      <span className="w-2 h-2 rounded-full bg-text-muted" />
      未审阅
    </span>
  )
}
