import type { PhotoGroup } from '../../api'

interface RandomToolbarProps {
  currentPhoto: PhotoGroup | null
  batchReviewed: number
  batchTotal: number
  sessionReviewed: number
  rightPanelOpen: boolean
  onToggleRightPanel: () => void
  cacheDays: number
  onCacheDaysChange: (days: number) => void
}

export default function RandomToolbar({
  currentPhoto, batchReviewed, batchTotal, sessionReviewed,
  rightPanelOpen, onToggleRightPanel, cacheDays, onCacheDaysChange,
}: RandomToolbarProps) {
  return (
    <div className="h-13 bg-bg-deep border-b border-border/30 flex items-center px-4 shrink-0">
      <div className="flex-1 text-center px-4">
        <span className="text-text-secondary text-sm font-mono truncate block max-w-md mx-auto">
          {currentPhoto?.name || ''}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {batchTotal > 0 && (
          <span className="text-text-muted text-sm font-display tabular-nums">
            <span className="text-text-heading">{batchReviewed}</span>
            <span className="mx-1 text-text-muted">/</span>
            <span>{batchTotal}</span>
          </span>
        )}
        {sessionReviewed > 0 && (
          <span className="text-text-muted text-xs tabular-nums">
            本次已审阅 {sessionReviewed}
          </span>
        )}

        <select
          value={cacheDays}
          onChange={e => onCacheDaysChange(Number(e.target.value))}
          className="bg-bg-card border border-border rounded px-2 py-1 text-text-secondary text-xs focus:outline-none focus:border-accent"
        >
          <option value={7}>缓存 7 天</option>
          <option value={30}>缓存 30 天</option>
        </select>

        <button
          onClick={onToggleRightPanel}
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors border-l border-border/30 ml-4 pl-4 ${
            rightPanelOpen ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
          }`}
          title="详细信息 ( ] )"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h6M13 8h6M13 12h6M5 16h.01M5 8h.01M5 12h.01" />
          </svg>
        </button>
      </div>
    </div>
  )
}
