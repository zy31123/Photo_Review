import { LayoutList, Timer } from 'lucide-react'
import type { PhotoGroup } from '../../api'
import ToolbarDivider from '../ui/ToolbarDivider'

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
    <div className="h-13 bg-white/80 backdrop-blur-xl border-b border-black/[0.06] flex items-center px-4 shrink-0">
      <div className="flex-1" />

      <div className="flex-1 text-center px-4">
        <span className="text-text-secondary text-sm font-mono truncate block max-w-md mx-auto">
          {currentPhoto?.name || ''}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-end gap-3">
        {batchTotal > 0 && (
          <span className="text-text-muted text-sm tabular-nums">
            <span className="text-text-heading font-medium">{batchReviewed}</span>
            <span className="mx-0.5 text-text-muted/60">/</span>
            <span>{batchTotal}</span>
          </span>
        )}
        {sessionReviewed > 0 && (
          <span className="text-text-muted text-xs tabular-nums">
            本次已审阅 {sessionReviewed}
          </span>
        )}

        <ToolbarDivider />

        <div className="flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-muted text-xs">缓存</span>
          <select
            value={cacheDays}
            onChange={e => onCacheDaysChange(Number(e.target.value))}
            className="bg-black/[0.03] border border-black/[0.06] rounded-lg px-2 py-1 text-text-secondary text-xs focus:outline-none focus:border-accent/50 transition-colors"
          >
            <option value={7}>7 天</option>
            <option value={30}>30 天</option>
          </select>
        </div>

        <ToolbarDivider />

        <button
          onClick={onToggleRightPanel}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            rightPanelOpen ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
          }`}
          title="详细信息 ( ] )"
        >
          <LayoutList className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
