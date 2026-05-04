import { PanelLeft, LayoutList } from 'lucide-react'
import { useReview } from '../../context/ReviewContext'
import ToolbarDivider from '../ui/ToolbarDivider'

export default function ReviewToolbar() {
  const { photos, currentPhoto, currentIndex, filteredPhotos, statusFilter, setStatusFilter, reviewedCount, leftSidebarOpen, rightPanelOpen, toggleLeftSidebar, toggleRightPanel } = useReview()

  const total = filteredPhotos.length
  const position = currentIndex + 1
  const totalCount = photos.length
  const progressPct = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0

  const filterOptions = [
    { value: 'all' as const, label: '全部' },
    { value: 'unreviewed' as const, label: '未审阅' },
    { value: 'reviewed' as const, label: '已审阅' },
  ]

  return (
    <div className="h-13 bg-bg-deep border-b border-border/30 flex items-center px-4 shrink-0">
      {/* Center: filename */}
      <div className="flex-1 text-center px-4">
        <span className="text-text-secondary text-sm font-mono truncate block max-w-md mx-auto">
          {currentPhoto?.name || ''}
        </span>
      </div>

      <ToolbarDivider />

      {/* Right: progress + filter + counter + toggles */}
      <div className="flex items-center gap-4">
        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-text-muted text-xs tabular-nums whitespace-nowrap">
            {reviewedCount}/{totalCount}
          </span>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-0.5 border-l border-border/30 pl-4">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                statusFilter === opt.value
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 border-l border-border/30 pl-4">
          <span className="text-text-muted text-sm font-display tabular-nums" data-testid="photo-counter">
            <span className="text-text-heading">{position.toLocaleString()}</span>
            <span className="mx-1 text-text-muted">/</span>
            <span>{total.toLocaleString()}</span>
          </span>
        </div>

        <div className="flex items-center gap-1 border-l border-border/30 pl-4">
          <button
            onClick={toggleLeftSidebar}
            data-testid="btn-toggle-sidebar"
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              leftSidebarOpen ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
            }`}
            title="日期导航 ( [ )"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <button
            onClick={toggleRightPanel}
            data-testid="btn-toggle-details"
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              rightPanelOpen ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
            }`}
            title="详细信息 ( ] )"
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
