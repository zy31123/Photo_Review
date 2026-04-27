import { useNavigate } from 'react-router-dom'
import { useReview } from '../../context/ReviewContext'

export default function ReviewToolbar() {
  const navigate = useNavigate()
  const { currentPhoto, currentIndex, filteredPhotos, leftSidebarOpen, rightPanelOpen, toggleLeftSidebar, toggleRightPanel } = useReview()

  const total = filteredPhotos.length
  const position = currentIndex + 1

  return (
    <div className="h-12 bg-bg-deep border-b border-border/30 flex items-center px-4 shrink-0">
      {/* Left: back button */}
      <button
        onClick={() => navigate('/')}
        className="text-text-muted hover:text-text transition-colors text-sm flex items-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
        返回
      </button>

      {/* Center: filename */}
      <div className="flex-1 text-center px-4">
        <span className="text-text-secondary text-sm font-mono truncate block max-w-md mx-auto">
          {currentPhoto?.name || ''}
        </span>
      </div>

      {/* Right: counter + toggles */}
      <div className="flex items-center gap-4">
        <span className="text-text-muted text-sm font-display tabular-nums">
          <span className="text-text-heading">{position.toLocaleString()}</span>
          <span className="mx-1 text-text-muted">/</span>
          <span>{total.toLocaleString()}</span>
        </span>

        <div className="flex items-center gap-1 border-l border-border/30 pl-4">
          <button
            onClick={toggleLeftSidebar}
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
