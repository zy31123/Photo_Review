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
    <div className="h-[var(--toolbar-height)] border-b border-border-subtle bg-glass backdrop-blur-xl flex items-center px-4 gap-3 shrink-0">
      <span className="text-text-secondary text-caption font-mono truncate max-w-[10rem]">
        {currentPhoto?.name || ''}
      </span>
      <ToolbarDivider />
      <div className="flex items-center gap-2">
        <div className="w-24 h-1.5 bg-fill rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all duration-slow" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="text-text-secondary text-micro tabular-nums font-medium">{reviewedCount}/{totalCount}</span>
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
      <span className="text-text-tertiary text-caption tabular-nums">
        <span className="text-text font-medium">{position.toLocaleString()}</span>
        <span className="mx-0.5 text-text-tertiary/60">/</span>
        <span>{total.toLocaleString()}</span>
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={toggleLeftSidebar}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-fast ${
            leftSidebarOpen ? 'text-accent bg-accent-subtle' : 'text-text-tertiary hover:text-text-secondary hover:bg-fill-subtle'
          }`}
          title="日期导航 ( [ )"
        >
          <PanelLeft className="size-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={toggleRightPanel}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-fast ${
            rightPanelOpen ? 'text-accent bg-accent-subtle' : 'text-text-tertiary hover:text-text-secondary hover:bg-fill-subtle'
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
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-text-secondary text-caption">加载中...</span>
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

  const leftW = '13rem'
  const rightW = '18rem'

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
        <div className="flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0">
            <ImageViewport />
          </div>
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
  const initialSubfolder = searchParams.get('subfolder') ?? undefined

  useEffect(() => {
    if (!isLoaded) navigate('/')
  }, [navigate, isLoaded])

  return (
    <ReviewProvider startId={startId} initialSubfolder={initialSubfolder}>
      <ReviewInner />
    </ReviewProvider>
  )
}

function ReviewInner() {
  const { refresh } = useReview()

  useEffect(() => { refresh() }, [refresh])

  return <ReviewLayout />
}
