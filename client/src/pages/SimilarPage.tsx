import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { SimilarProvider, useSimilar } from '../context/SimilarContext'
import NavBar from '../components/NavBar'
import SimilarToolbar from '../components/similar/SimilarToolbar'
import ClusterGrid from '../components/similar/ClusterGrid'

function SimilarLayout() {
  const { status, groups, progress, refreshStats } = useSimilar()

  useEffect(() => { refreshStats() }, [refreshStats])

  if (status === 'analyzing') {
    const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0
    return (
      <div className="h-screen flex flex-col bg-bg">
        <NavBar />
        <SimilarToolbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-5 w-64">
            <div className="relative">
              <div className="w-10 h-10 border-[0.1875rem] border-accent border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 w-10 h-10 border-2 border-accent/30 rounded-full spinner-pulse" />
            </div>
            <div className="w-full flex flex-col items-center gap-2">
              <div className="w-full h-1.5 bg-bg-deep rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-200 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-text-secondary text-sm tracking-wide">
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
          <svg className="w-14 h-14 text-text-muted mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-text-secondary text-lg mb-2">未发现相似照片</p>
          <p className="text-text-muted text-sm">所有照片都足够独特，无需清理</p>
        </div>
      </div>
    )
  }

  if (status === 'idle' && groups.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-bg">
        <NavBar />
        <SimilarToolbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <svg className="w-14 h-14 text-text-muted mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-text-secondary text-lg mb-2">相似照片聚类</p>
          <p className="text-text-muted text-sm">点击「分析相似照片」开始检测连拍和相似图片</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <NavBar />
      <SimilarToolbar />
      <ClusterGrid />
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
