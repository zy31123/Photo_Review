import { useEffect, useCallback, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { SimilarProvider, useSimilar } from '../context/SimilarContext'
import NavBar from '../components/NavBar'
import SimilarToolbar from '../components/similar/SimilarToolbar'
import ClusterGrid from '../components/similar/ClusterGrid'
import ClusterLightbox from '../components/similar/ClusterLightbox'

function SimilarLayout() {
  const { status, groups, progress, refreshStats, analyze, lightbox, selectedDeleteCount,
    focusedIndex, setFocusedIndex, keepRecommendedFocused, openLightboxFocused, deleteSelected,
  } = useSimilar()

  useEffect(() => { refreshStats() }, [refreshStats])

  // Confirmation state for batch delete
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleBatchDelete = useCallback(() => {
    if (confirmDelete) {
      clearTimeout(confirmTimerRef.current)
      setConfirmDelete(false)
      deleteSelected()
    } else {
      setConfirmDelete(true)
      clearTimeout(confirmTimerRef.current)
      confirmTimerRef.current = setTimeout(() => setConfirmDelete(false), 2000)
    }
  }, [confirmDelete, deleteSelected])

  useEffect(() => () => clearTimeout(confirmTimerRef.current), [])

  // Grid-level keyboard shortcuts (only when lightbox is closed)
  const handleGridKey = useCallback((e: KeyboardEvent) => {
    if (lightbox.open) return
    if (status !== 'done' || groups.length === 0) return
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    const clamp = (i: number) => Math.max(0, Math.min(i, groups.length - 1))

    switch (e.key) {
      case 'ArrowDown':
      case 'j':
      case 'J':
        e.preventDefault()
        if (groups.length > 0) setFocusedIndex(clamp(focusedIndex + 1))
        break
      case 'ArrowUp':
      case 'k':
      case 'K':
        e.preventDefault()
        if (groups.length > 0) setFocusedIndex(clamp(focusedIndex - 1))
        break
      case 'Enter':
        e.preventDefault()
        openLightboxFocused()
        break
      case 'd':
      case 'D':
        e.preventDefault()
        keepRecommendedFocused()
        break
      case 'Delete':
        e.preventDefault()
        handleBatchDelete()
        break
    }
  }, [lightbox.open, status, groups.length, focusedIndex, setFocusedIndex, openLightboxFocused, keepRecommendedFocused, handleBatchDelete])

  useEffect(() => {
    document.addEventListener('keydown', handleGridKey)
    return () => document.removeEventListener('keydown', handleGridKey)
  }, [handleGridKey])

  if (status === 'analyzing') {
    const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0
    return (
      <div className="h-screen flex flex-col bg-bg">
        <NavBar />
        <SimilarToolbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 w-60">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <div className="w-full flex flex-col items-center gap-2">
              <div className="w-full h-1 bg-fill rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-fast ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-text-secondary text-caption">
                {progress
                  ? `正在分析 ${progress.current}/${progress.total} 张照片...`
                  : '正在准备分析...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'done' && groups.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-bg">
        <NavBar />
        <SimilarToolbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-success-subtle flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-text text-title-2 font-semibold mb-1.5">未发现相似照片</p>
          <p className="text-text-secondary text-caption">所有照片都足够独特，无需清理</p>
        </div>
      </div>
    )
  }

  if (status === 'idle' && groups.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-bg">
        <NavBar />
        <SimilarToolbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-fill-subtle flex items-center justify-center">
            <svg className="w-10 h-10 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.25} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-text font-bold mb-2" style={{ fontSize: 'var(--text-title-1)' }}>相似照片聚类</p>
            <p className="text-text-secondary mb-6" style={{ fontSize: 'var(--text-body)' }}>检测连拍和相似图片，帮助你快速清理重复照片</p>
          </div>
          <button
            onClick={analyze}
            className="px-8 py-3 rounded-xl bg-accent text-white font-semibold text-body hover:bg-accent-hover transition-all duration-fast shadow-card active:scale-[0.97]"
          >
            开始分析
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <NavBar />
      <SimilarToolbar />
      <ClusterGrid />
      <ClusterLightbox />
      {confirmDelete && selectedDeleteCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 rounded-xl bg-danger/90 text-white text-body font-medium shadow-lg backdrop-blur-sm animate-pulse">
          再按一次 Delete 确认删除 {selectedDeleteCount} 张照片
        </div>
      )}
    </div>
  )
}

export default function SimilarPage() {
  const navigate = useNavigate()
  const { isLoaded } = useApp()

  useEffect(() => {
    if (!isLoaded) navigate('/')
  }, [navigate, isLoaded])

  if (!isLoaded) return null

  return (
    <SimilarProvider>
      <SimilarLayout />
    </SimilarProvider>
  )
}
