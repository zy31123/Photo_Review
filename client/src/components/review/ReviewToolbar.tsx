import { useReview } from '../../context/ReviewContext'

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

      <div className="w-px h-6 bg-border/40" />

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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
              <line x1="9" y1="4" x2="9" y2="22" strokeWidth="1.5" />
            </svg>
          </button>
          <button
            onClick={toggleRightPanel}
            data-testid="btn-toggle-details"
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
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
    </div>
  )
}
