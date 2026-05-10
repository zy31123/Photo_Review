import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Eye, Shuffle, Folder, PanelLeft, LayoutList, Minus, Plus } from 'lucide-react'
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
      <div className="flex items-center gap-1">
        <button
          onClick={() => setColumns(Math.max(2, columns - 1))}
          disabled={columns <= 2}
          className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center text-text-secondary hover:bg-black/[0.06] disabled:opacity-30 transition-colors"
        >
          <Minus className="size-3" />
        </button>
        <span className="text-text-secondary text-xs tabular-nums w-6 text-center font-medium">{columns}</span>
        <button
          onClick={() => setColumns(Math.min(8, columns + 1))}
          disabled={columns >= 8}
          className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center text-text-secondary hover:bg-black/[0.06] disabled:opacity-30 transition-colors"
        >
          <Plus className="size-3" />
        </button>
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

      <div className="w-px h-6 bg-black/[0.06]" />

      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="text-text-muted text-xs tabular-nums">{reviewedCount}/{totalCount}</span>
      </div>

      <div className="flex items-center gap-0.5">
        {filterOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-2 py-1 rounded-md text-xs transition-colors ${
              statusFilter === opt.value ? 'bg-accent/10 text-accent font-medium' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-black/[0.06]" />

      <span className="text-text-muted text-sm tabular-nums">
        <span className="text-text-heading font-medium">{position.toLocaleString()}</span>
        <span className="mx-0.5 text-text-muted/60">/</span>
        <span>{total.toLocaleString()}</span>
      </span>

      <div className="w-px h-6 bg-black/[0.06]" />

      <button
        onClick={toggleLeftSidebar}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          leftSidebarOpen ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
        }`}
        title="日期导航 ( [ )"
      >
        <PanelLeft className="w-4 h-4" />
      </button>
      <button
        onClick={toggleRightPanel}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
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
    <div className="h-13 bg-white/80 backdrop-blur-xl border-b border-black/[0.06] flex items-center px-4 shrink-0">
      <button
        onClick={() => navigate('/')}
        className="text-text-heading font-semibold text-base tracking-tight hover:text-accent transition-colors"
      >
        Photo Review
      </button>

      <div className="flex items-center bg-black/[0.04] rounded-lg p-1 ml-6">
        {navItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              disabled={!isLoaded}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-white text-text-heading shadow-sm'
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
