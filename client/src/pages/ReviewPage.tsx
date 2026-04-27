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
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-text-muted text-sm tracking-wide">加载中...</span>
        </div>
      </div>
    )
  }

  if (!filteredPhotos.length) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg">
        <p className="text-text-secondary text-lg mb-4">暂无照片</p>
        <button onClick={() => navigate('/')} className="text-accent hover:underline">
          返回首页
        </button>
      </div>
    )
  }

  const gridCols = leftSidebarOpen
    ? rightPanelOpen
      ? '220px 1fr 280px'
      : '220px 1fr 0px'
    : rightPanelOpen
      ? '48px 1fr 280px'
      : '48px 1fr 0px'

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <ReviewToolbar />
      <div
        className="flex-1 min-h-0 review-grid"
        style={{ display: 'grid', gridTemplateColumns: gridCols }}
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
