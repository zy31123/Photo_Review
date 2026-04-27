import { useReview } from '../../context/ReviewContext'
import SectionHeader from '../ui/SectionHeader'

export default function DetailsPanel() {
  const { currentPhoto, rightPanelOpen, reviewedIds } = useReview()

  if (!rightPanelOpen || !currentPhoto) return <div />

  const folderName = currentPhoto.folder ? currentPhoto.folder.split('/').pop() || currentPhoto.folder : ''
  const formattedDate = formatChineseDate(currentPhoto.date)

  return (
    <div className="h-full bg-bg-deep border-l border-border/30 overflow-y-auto">
      <SectionHeader title="文件信息" />
      <div className="px-4 py-3 space-y-3">
        <MetaRow label="文件名" value={currentPhoto.name} mono />
        <MetaRow label="日期" value={formattedDate} />
        <MetaRow label="文件夹" value={folderName} />
      </div>

      <SectionHeader title="RAW 配对" />
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${currentPhoto.hasRaw ? 'bg-success' : 'bg-danger'}`} />
          <span className={`text-sm ${currentPhoto.hasRaw ? 'text-success' : 'text-danger'}`}>
            {currentPhoto.hasRaw ? 'RAW 已配对' : 'RAW 缺失'}
          </span>
        </div>
        {currentPhoto.rawPaths.length > 0 && (
          <div className="space-y-1 mt-2">
            {currentPhoto.rawPaths.map((p, i) => (
              <p key={i} className="text-[11px] text-text-muted font-mono truncate" title={p}>
                {p.split('/').pop()}
              </p>
            ))}
          </div>
        )}
      </div>

      <SectionHeader title="文件路径" />
      <div className="px-4 py-3 space-y-2">
        {currentPhoto.jpgPath && (
          <div>
            <p className="text-[11px] text-text-muted mb-0.5">JPG</p>
            <p className="text-[11px] text-text-secondary font-mono truncate" title={currentPhoto.jpgPath}>
              {currentPhoto.jpgPath}
            </p>
          </div>
        )}
        {currentPhoto.rawPaths.map((p, i) => (
          <div key={i}>
            <p className="text-[11px] text-text-muted mb-0.5">RAW {currentPhoto.rawPaths.length > 1 ? i + 1 : ''}</p>
            <p className="text-[11px] text-text-secondary font-mono truncate" title={p}>
              {p}
            </p>
          </div>
        ))}
      </div>

      <SectionHeader title="审阅状态" />
      <div className="px-4 py-3">
        <StatusBadge reviewed={reviewedIds.has(currentPhoto.id)} />
      </div>
    </div>
  )
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-[11px] text-text-muted shrink-0">{label}</span>
      <span className={`text-[13px] text-text text-right max-w-[170px] truncate ${mono ? 'font-mono' : ''}`} title={value}>
        {value || '—'}
      </span>
    </div>
  )
}

function StatusBadge({ reviewed }: { reviewed: boolean }) {
  if (reviewed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-success">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        已审阅
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-text-muted">
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
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
