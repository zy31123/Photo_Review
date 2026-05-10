import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Eye, Shuffle, Folder, PanelLeft, LayoutList } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useGrid } from '../context/GridContext'
import { useReview } from '../context/ReviewContext'

const navItems = [
  { path: '/grid', label: '网格', icon: LayoutGrid },
  { path: '/review', label: '审阅', icon: Eye },
  { path: '/random', label: '随机', icon: Shuffle },
]

function GridControls() {
  const { columns, setColumns, filteredPhotos } = useGrid()
  return (
    <div className="flex items-center gap-3">
      <span className="text-text-muted text-sm">{filteredPhotos.length.toLocaleString()} 张</span>
      <div className="flex items-center gap-2">
        <input
          type="range" min={2} max={8} step={1}
          value={columns}
          onChange={e => setColumns(Number(e.target.value))}
          className="w-20 h-1 accent-accent cursor-pointer"
        />
        <span className="text-text-muted text-xs tabular-nums w-3 text-center">{columns}</span>
      </div>
    </div>
  )
}

function ReviewControls() {
  const {
    currentPhoto, currentIndex, filteredPhotos, photos,
    statusFilter, setStatusFilter, reviewedCount,
    leftSidebarOpen, rightPanelOpen, toggleLeftSidebar, toggleRightPanel,
  } = useReview()

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
    <div className="flex items-center gap-3">
      <span className="text-text-secondary text-sm font-mono truncate max-w-[10rem]">
        {currentPhoto?.name || ''}
      </span>

      <div className="w-px h-6 bg-border/40" />

      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 bg-bg rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="text-text-muted text-xs tabular-nums">{reviewedCount}/{totalCount}</span>
      </div>

      <div className="flex items-center gap-0.5">
        {filterOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              statusFilter === opt.value ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-border/40" />

      <span className="text-text-muted text-sm font-display tabular-nums">
        <span className="text-text-heading">{position.toLocaleString()}</span>
        <span className="mx-1">/</span>
        <span>{total.toLocaleString()}</span>
      </span>

      <div className="w-px h-6 bg-border/40" />

      <button
        onClick={toggleLeftSidebar}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          leftSidebarOpen ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
        }`}
        title="日期导航 ( [ )"
      >
        <PanelLeft className="w-4 h-4" />
      </button>
      <button
        onClick={toggleRightPanel}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          rightPanelOpen ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
        }`}
        title="详细信息 ( ] )"
      >
        <LayoutList className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function NavBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { activeFolder, isLoaded } = useApp()

  return (
    <div className="h-13 bg-bg-deep border-b border-border/30 flex items-center px-4 shrink-0">
      <button
        onClick={() => navigate('/')}
        className="text-text-heading font-display font-semibold text-base tracking-wide hover:text-accent transition-colors"
      >
        Photo Review
      </button>

      <div className="flex items-center bg-bg-raised rounded-lg p-0.5 ml-6">
        {navItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              disabled={!isLoaded}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-bg-deep text-text-heading shadow-sm'
                  : isLoaded
                    ? 'text-text-muted hover:text-text-secondary'
                    : 'text-text-muted/40 cursor-not-allowed'
              }`}
            >
              <Icon className="size-3.5" />
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="ml-auto flex items-center gap-3">
        {pathname === '/grid' && <GridControls />}
        {pathname === '/review' && <ReviewControls />}
        {pathname !== '/grid' && pathname !== '/review' && activeFolder && (
          <div className="flex items-center gap-1.5 text-text-muted text-sm">
            <Folder className="size-3.5" />
            <span className="max-w-[12.5rem] truncate">{activeFolder.split(/[\\/]/).pop()}</span>
          </div>
        )}
      </div>
    </div>
  )
}
