import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PanelLeft, LayoutList } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ReviewProvider, useReview } from '../context/ReviewContext'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import NavBar from '../components/NavBar'
import DateSidebar from '../components/review/DateSidebar'
import ImageViewport from '../components/review/ImageViewport'
import DetailsPanel from '../components/review/DetailsPanel'
import Filmstrip from '../components/review/Filmstrip'
import EmptyState from '../components/ui/EmptyState'
import SegmentedControl from '../components/ui/SegmentedControl'
import ToolbarDivider from '../components/ui/ToolbarDivider'
import { ImageIcon } from 'lucide-react'

function ReviewToolbar() {
  const {
    currentPhoto, currentIndex, filteredPhotos, photos,
    statusFilter, setStatusFilter, reviewedCount,
    leftSidebarOpen, rightPanelOpen, toggleLeftSidebar, toggleRightPanel,
  } = useReview()

  const total = filteredPhotos.length
  const position = currentIndex + 1
  const totalCount = photos.length
  const progressPct = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0

  return (
    <div className="h-10 border-b border-border-faint bg-surface-primary backdrop-blur-xl flex items-center px-4 gap-4 shrink-0">
      <span className="text-text-secondary text-sm font-mono truncate max-w-[10rem]">
        {currentPhoto?.name || ''}
      </span>
      <ToolbarDivider />
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 bg-fill-medium rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="text-text-muted text-xs tabular-nums">{reviewedCount}/{totalCount}</span>
      </div>
      <SegmentedControl
        options={[
          { value: 'all' as const, label: '全部' },
          { value: 'unreviewed' as const, label: '未审阅' },
          { value: 'reviewed' as const, label: '已审阅' },
        ]}
        value={statusFilter}
        onChange={setStatusFilter}
      />
      <ToolbarDivider />
      <span className="text-text-muted text-sm tabular-nums">
        <span className="text-text-heading font-medium">{position.toLocaleString()}</span>
        <span className="mx-0.5 text-text-muted/60">/</span>
        <span>{total.toLocaleString()}</span>
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={toggleLeftSidebar}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            leftSidebarOpen ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
          }`}
          title="日期导航 ( [ )"
        >
          <PanelLeft className="size-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={toggleRightPanel}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            rightPanelOpen ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
          }`}
          title="详细信息 ( ] )"
        >
          <LayoutList className="size-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

function ReviewLayout() {
  const navigate = useNavigate()
  const {
    filteredPhotos, currentIndex, loading, leftSidebarOpen, rightPanelOpen,
    goTo, handleAction, toggleLeftSidebar, toggleRightPanel,
  } = useReview()

  const shortcuts = useMemo(() => ({
    onPrev: () => goTo(currentIndex - 1),
    onNext: () => goTo(currentIndex + 1),
    onKeep: () => handleAction('keep'),
    onDelete: () => handleAction('deleted'),
    onToggleLeft: toggleLeftSidebar,
    onToggleRight: toggleRightPanel,
  }), [currentIndex, goTo, handleAction, toggleLeftSidebar, toggleRightPanel])

  useKeyboardShortcuts(shortcuts)

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-bg">
        <NavBar />
        <div className="flex-1 flex items-center justify-center bg-bg">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 border-[0.1875rem] border-accent border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 w-10 h-10 border-2 border-accent/30 rounded-full spinner-pulse" />
            </div>
            <span className="text-text-secondary text-sm tracking-wide">加载中...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!filteredPhotos.length) {
    return (
      <div className="h-screen flex flex-col bg-bg">
        <NavBar />
        <div className="flex-1 flex flex-col items-center justify-center bg-bg">
          <EmptyState
            icon={ImageIcon}
            title="暂无照片"
            description="请返回首页选择一个包含照片的文件夹"
            action={{ label: '返回首页', onClick: () => navigate('/') }}
          />
        </div>
      </div>
    )
  }

  const leftW = '15rem'
  const rightW = '20rem'

  const gridCols = leftSidebarOpen
    ? rightPanelOpen
      ? `${leftW} 1fr ${rightW}`
      : `${leftW} 1fr 0px`
    : rightPanelOpen
      ? `3rem 1fr ${rightW}`
      : '3rem 1fr 0'

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <NavBar />
      <ReviewToolbar />
      <div
        className="flex-1 min-h-0 review-grid relative"
        data-testid="review-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          columnGap: '0.5rem',
          transition: 'grid-template-columns 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        <DateSidebar />
        <div className="relative overflow-hidden">
          <ImageViewport />
          <Filmstrip />
        </div>
        <DetailsPanel />
      </div>
    </div>
  )
}

export default function ReviewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isLoaded } = useApp()
  const startId = searchParams.get('startId') ?? undefined

  useEffect(() => {
    if (!isLoaded) navigate('/')
  }, [navigate, isLoaded])

  return (
    <ReviewProvider startId={startId}>
      <ReviewInner />
    </ReviewProvider>
  )
}

function ReviewInner() {
  const { refresh } = useReview()

  useEffect(() => { refresh() }, [refresh])

  return <ReviewLayout />
}
