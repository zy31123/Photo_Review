import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveFolder } from '../api'
import { ReviewProvider, useReview } from '../context/ReviewContext'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import ReviewToolbar from '../components/review/ReviewToolbar'
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
      <div className="h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 w-10 h-10 border-2 border-accent/30 rounded-full spinner-pulse" />
          </div>
          <span className="text-text-secondary text-sm tracking-wide">加载中...</span>
        </div>
      </div>
    )
  }

  if (!filteredPhotos.length) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg">
        <svg className="w-14 h-14 text-text-muted mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-text-secondary text-lg mb-2">暂无照片</p>
        <p className="text-text-muted text-sm mb-6">请返回首页选择一个包含照片的文件夹</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text hover:bg-bg-hover hover:border-border-light transition-all duration-200"
        >
          返回首页
        </button>
      </div>
    )
  }

  const leftW = 'clamp(260px, 14vw, 380px)'
  const rightW = 'clamp(300px, 18vw, 440px)'

  const gridCols = leftSidebarOpen
    ? rightPanelOpen
      ? `${leftW} 1fr ${rightW}`
      : `${leftW} 1fr 0px`
    : rightPanelOpen
      ? `48px 1fr ${rightW}`
      : '48px 1fr 0px'

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <ReviewToolbar />
      <div
        className="flex-1 min-h-0 review-grid"
        data-testid="review-grid"
        style={{ display: 'grid', gridTemplateColumns: gridCols, columnGap: 8 }}
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

  useEffect(() => {
    if (!getActiveFolder()) navigate('/')
  }, [navigate])

  return (
    <ReviewProvider>
      <ReviewInner />
    </ReviewProvider>
  )
}

function ReviewInner() {
  const { refresh } = useReview()

  useEffect(() => { refresh() }, [refresh])

  return <ReviewLayout />
}
