import { Check, X } from 'lucide-react'
import type { PhotoGroup, ExifData } from '../../api'
import { formatChineseDate } from '../../utils/date'
import SectionHeader from '../ui/SectionHeader'
import Badge from '../ui/Badge'

interface PhotoDetailsViewProps {
  photo: PhotoGroup
  exif: ExifData | null
  reviewed?: boolean
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mx-5 mb-4 rounded-xl border border-border-faint bg-surface-secondary shadow-card overflow-hidden">{children}</div>
}

export default function PhotoDetailsView({ photo, exif, reviewed }: PhotoDetailsViewProps) {
  const folderName = photo.folder ? photo.folder.split(/[/\\]/).pop() || photo.folder : ''
  const formattedDate = formatChineseDate(photo.date)

  return (
    <>
      <Card>
        <SectionHeader title="文件信息" compact />
        <div className="px-5 py-4 space-y-3">
          <MetaRow label="文件名" value={photo.name} mono />
          <MetaRow label="日期" value={formattedDate} />
          <MetaRow label="文件夹" value={folderName} />
        </div>
      </Card>

      {exif && (
        <Card>
          <SectionHeader title="拍摄参数" compact />
          <div className="px-5 py-4 space-y-3">
            <MetaRow label="相机" value={exif.camera} />
            <MetaRow label="镜头" value={exif.lens} />
            {exif.focalLength && (
              <CompactExifBar exif={exif} />
            )}
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
        <div className="px-5 py-3.5 flex flex-wrap items-center gap-2">
          <FileStatusBadge exists={photo.hasJpg} label={photo.hasJpg ? 'JPG 存在' : 'JPG 缺失'} />
          <FileStatusBadge exists={photo.hasRaw} label={photo.hasRaw ? 'RAW 已配对' : 'RAW 缺失'} />
        </div>
      </Card>

      <Card>
        <SectionHeader title="文件路径" compact />
        <div className="px-5 py-3.5 space-y-2">
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
          <div className="px-5 py-3.5">
            <ReviewStatusBadge reviewed={reviewed} />
          </div>
        </Card>
      )}
    </>
  )
}

function CompactExifBar({ exif }: { exif: ExifData }) {
  const parts = [exif.focalLength, exif.aperture, exif.shutterSpeed, `ISO ${exif.iso}`].filter(Boolean)
  if (parts.length === 0) return null
  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary bg-fill-quiet rounded-lg px-4 py-2.5">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-text-muted/50">·</span>}
          <span className="font-medium text-text">{part}</span>
        </span>
      ))}
    </div>
  )
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-x-5 items-start">
      <span className="text-sm text-text-secondary shrink-0">{label}</span>
      <span className={`text-sm font-medium text-text text-left break-all ${mono ? 'font-mono' : ''}`} title={value}>
        {value || '—'}
      </span>
    </div>
  )
}

function FileStatusBadge({ exists, label }: { exists: boolean; label: string }) {
  return (
    <Badge variant={exists ? 'success' : 'danger'} >
      {exists ? <Check className="size-3" strokeWidth={2.5} /> : <X className="size-3" strokeWidth={2.5} />}
      {label}
    </Badge>
  )
}

function ReviewStatusBadge({ reviewed }: { reviewed: boolean }) {
  if (reviewed) {
    return (
      <Badge variant="success" >
        <Check className="size-3" strokeWidth={2.5} />
        已审阅
      </Badge>
    )
  }
  return (
    <Badge variant="neutral" >
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
      未审阅
    </Badge>
  )
}
