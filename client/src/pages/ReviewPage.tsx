import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ReviewProvider, useReview } from '../context/ReviewContext'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import NavBar from '../components/NavBar'
import DateSidebar from '../components/review/DateSidebar'
import ImageViewport from '../components/review/ImageViewport'
import DetailsPanel from '../components/review/DetailsPanel'
import Filmstrip from '../components/review/Filmstrip'

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
          <svg className="w-14 h-14 text-text-muted mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-text-secondary text-lg mb-2">暂无照片</p>
          <p className="text-text-muted text-sm mb-6">请返回首页选择一个包含照片的文件夹</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg border border-black/[0.06] text-text-secondary hover:text-text hover:bg-black/[0.04] transition-all duration-200"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const leftW = 'clamp(16.25rem, 14vw, 23.75rem)'
  const rightW = 'clamp(18.75rem, 18vw, 27.5rem)'

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
      <div
        className="flex-1 min-h-0 review-grid"
        data-testid="review-grid"
        style={{ display: 'grid', gridTemplateColumns: gridCols, columnGap: '0.5rem' }}
      >
        <DateSidebar />
        <ImageViewport />
        <DetailsPanel />
      </div>
      <Filmstrip />
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
