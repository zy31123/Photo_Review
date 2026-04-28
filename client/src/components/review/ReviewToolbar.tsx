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
            onClick={() => navigate('/random')}
            className="w-8 h-8 rounded flex items-center justify-center transition-colors text-text-muted hover:text-text-secondary"
            title="随机浏览"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => navigate('/batch')}
            className="w-8 h-8 rounded flex items-center justify-center transition-colors text-text-muted hover:text-text-secondary"
            title="批量处理"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
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
