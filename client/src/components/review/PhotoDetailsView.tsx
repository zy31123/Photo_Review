import { Check, X, Star, Heart } from 'lucide-react'
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
  return <div className="mx-4 mb-3 rounded-lg bg-fill-subtle overflow-hidden">{children}</div>
}

export default function PhotoDetailsView({ photo, exif, reviewed }: PhotoDetailsViewProps) {
  const folderName = photo.folder ? photo.folder.split(/[/\\]/).pop() || photo.folder : ''
  const formattedDate = formatChineseDate(photo.date)

  return (
    <>
      <Card>
        <SectionHeader title="文件信息" compact />
        <div className="px-4 py-3 space-y-2.5">
          <MetaRow label="文件名" value={photo.name} mono />
          <MetaRow label="日期" value={formattedDate} />
          <MetaRow label="文件夹" value={folderName} />
        </div>
      </Card>

      {exif && (
        <Card>
          <SectionHeader title="拍摄参数" compact />
          <div className="px-4 py-3 space-y-2.5">
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
        <SectionHeader title="评分与收藏" compact />
        <div className="px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-micro text-text-tertiary">评分</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  size={12}
                  strokeWidth={1.5}
                  className={star <= (photo.rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-text-tertiary/30'}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Heart
              size={12}
              strokeWidth={1.5}
              className={photo.favorite ? 'text-red-400 fill-red-400' : 'text-text-tertiary/30'}
            />
            <span className="text-micro text-text-secondary">{photo.favorite ? '已收藏' : '未收藏'}</span>
          </div>
        </div>
      </Card>

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
              <p className="text-caption text-text-secondary mb-0.5">JPG</p>
              <p className="text-caption text-text-secondary font-mono break-all" title={photo.jpgPath}>
                {photo.jpgPath}
              </p>
            </div>
          )}
          {photo.rawPaths.map((p, i) => (
            <div key={i}>
              <p className="text-caption text-text-secondary mb-0.5">RAW {photo.rawPaths.length > 1 ? i + 1 : ''}</p>
              <p className="text-caption text-text-secondary font-mono break-all" title={p}>
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

function CompactExifBar({ exif }: { exif: ExifData }) {
  const parts = [exif.focalLength, exif.aperture, exif.shutterSpeed, `ISO ${exif.iso}`].filter(Boolean)
  if (parts.length === 0) return null
  return (
    <div className="flex items-center gap-1.5 text-micro text-text-secondary bg-fill-subtle rounded-sm px-3 py-2">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-text-tertiary/50">·</span>}
          <span className="font-medium text-text">{part}</span>
        </span>
      ))}
    </div>
  )
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-x-3 items-start">
      <span className="text-micro text-text-tertiary uppercase tracking-wider shrink-0">{label}</span>
      <span className={`text-caption font-medium text-text text-left break-all ${mono ? 'font-mono' : ''}`} title={value}>
        {value || '—'}
      </span>
    </div>
  )
}

function FileStatusBadge({ exists, label }: { exists: boolean; label: string }) {
  return (
    <Badge variant={exists ? 'success' : 'danger'}>
      {exists ? <Check className="size-3" strokeWidth={2.5} /> : <X className="size-3" strokeWidth={2.5} />}
      {label}
    </Badge>
  )
}

function ReviewStatusBadge({ reviewed }: { reviewed: boolean }) {
  if (reviewed) {
    return (
      <Badge variant="success">
        <Check className="size-3" strokeWidth={2.5} />
        已审阅
      </Badge>
    )
  }
  return (
    <Badge variant="neutral">
      <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
      未审阅
    </Badge>
  )
}
