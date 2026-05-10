import { Check, X } from 'lucide-react'
import type { PhotoGroup, ExifData } from '../../api'
import { formatChineseDate } from '../../utils/date'
import SectionHeader from '../ui/SectionHeader'

interface PhotoDetailsViewProps {
  photo: PhotoGroup
  exif: ExifData | null
  reviewed?: boolean
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mx-4 mb-3 rounded-lg border border-border/40 bg-bg-card shadow-card overflow-hidden">{children}</div>
}

export default function PhotoDetailsView({ photo, exif, reviewed }: PhotoDetailsViewProps) {
  const folderName = photo.folder ? photo.folder.split(/[/\\]/).pop() || photo.folder : ''
  const formattedDate = formatChineseDate(photo.date)

  return (
    <>
      <Card>
        <SectionHeader title="文件信息" compact />
        <div className="px-4 py-3 space-y-3">
          <MetaRow label="文件名" value={photo.name} mono />
          <MetaRow label="日期" value={formattedDate} />
          <MetaRow label="文件夹" value={folderName} />
        </div>
      </Card>

      {exif && (
        <Card>
          <SectionHeader title="拍摄参数" compact />
          <div className="px-4 py-3 space-y-3">
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
        </Card>
      )}

      <Card>
        <SectionHeader title="文件状态" compact />
        <div className="px-4 py-3 flex flex-wrap items-center gap-2">
          <FileStatusBadge exists={photo.hasJpg} label={photo.hasJpg ? 'JPG 存在' : 'JPG 缺失'} />
          <FileStatusBadge exists={photo.hasRaw} label={photo.hasRaw ? 'RAW 已配对' : 'RAW 缺失'} />
        </div>
      </Card>

      <Card>
        <SectionHeader title="文件路径" compact />
        <div className="px-4 py-3 space-y-2">
          {photo.jpgPath && (
            <div>
              <p className="text-sm text-text-secondary mb-0.5">JPG</p>
              <p className="text-sm text-text-secondary font-mono break-all" title={photo.jpgPath}>
                {photo.jpgPath}
              </p>
            </div>
          )}
          {photo.rawPaths.map((p, i) => (
            <div key={i}>
              <p className="text-sm text-text-secondary mb-0.5">RAW {photo.rawPaths.length > 1 ? i + 1 : ''}</p>
              <p className="text-sm text-text-secondary font-mono break-all" title={p}>
                {p}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {reviewed !== undefined && (
        <Card>
          <SectionHeader title="审阅状态" compact />
          <div className="px-4 py-3">
            <ReviewStatusBadge reviewed={reviewed} />
          </div>
        </Card>
      )}
    </>
  )
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 items-start">
      <span className="text-sm text-text-secondary shrink-0">{label}</span>
      <span className={`text-sm font-medium text-text text-right break-all ${mono ? 'font-mono' : ''}`} title={value}>
        {value || '—'}
      </span>
    </div>
  )
}

function FileStatusBadge({ exists, label }: { exists: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
      exists ? 'bg-success-bg text-success-text' : 'bg-danger-bg text-danger-text'
    }`}>
      {exists ? <Check className="w-3 h-3" strokeWidth={2} /> : <X className="w-3 h-3" strokeWidth={2} />}
      {label}
    </span>
  )
}

function ReviewStatusBadge({ reviewed }: { reviewed: boolean }) {
  if (reviewed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-success-bg text-success-text">
        <Check className="w-3 h-3" strokeWidth={2} />
        已审阅
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-bg-raised text-text-secondary">
      <span className="w-2 h-2 rounded-full bg-text-muted" />
      未审阅
    </span>
  )
}
