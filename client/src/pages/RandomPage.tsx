import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type PhotoGroup } from '../api'

export default function RandomPage() {
  const navigate = useNavigate()
  const [photo, setPhoto] = useState<PhotoGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [cacheDays, setCacheDays] = useState(7)
  const [error, setError] = useState('')
  const photoRef = useRef(photo)
  photoRef.current = photo

  const loadNext = useCallback(async () => {
    setLoading(true)
    try {
      const next = await api.getRandomPhoto()
      setPhoto(next)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    api.getSettings().then(s => {
      if (s.random_cache_days) setCacheDays(Number(s.random_cache_days))
    })
    loadNext()
  }, [loadNext])

  const handleAction = useCallback(async (action: 'keep' | 'deleted' | 'skip') => {
    if (action === 'skip') {
      loadNext()
      return
    }

    const current = photoRef.current
    if (!current) return
    setError('')
    try {
      if (action === 'deleted') {
        await api.deletePhoto(current.id)
      }
      await api.submitReview(current.id, action, 'random')
      setReviewedCount(prev => prev + 1)
      loadNext()
    } catch (e: any) {
      setError(e.message || '操作失败')
    }
  }, [loadNext])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); handleAction('keep') }
      else if (e.key === 'd' || e.key === 'D') handleAction('deleted')
      else if (e.key === 'r' || e.key === 'R') handleAction('skip')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleAction])

  return (
    <div className="h-screen flex flex-col bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <button onClick={() => navigate('/')} className="text-text-muted hover:text-text text-sm">
          ← 返回
        </button>
        <h1 className="text-lg font-display font-bold">随机审阅</h1>
        <div className="flex items-center gap-3 text-sm">
          <select
            value={cacheDays}
            onChange={async (e) => {
              const days = Number(e.target.value)
              setCacheDays(days)
              await api.updateSettings({ random_cache_days: String(days) })
            }}
            className="bg-bg-card border border-border rounded px-2 py-1 text-text-secondary text-xs focus:outline-none focus:border-accent"
          >
            <option value={7}>缓存 7 天</option>
            <option value={30}>缓存 30 天</option>
          </select>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="mx-5 mt-2 px-4 py-2 rounded-lg bg-danger/20 border border-danger/40 text-danger text-sm text-center">
          {error}
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-6 py-4">
        {loading ? (
          <span className="text-text-secondary">加载中...</span>
        ) : !photo ? (
          <div className="text-center">
            <p className="text-text-secondary text-lg mb-2">没有更多未审查的照片</p>
            <p className="text-text-muted text-sm">已审阅 {reviewedCount} 张</p>
          </div>
        ) : (
          <img
            src={api.fullUrl(photo.id)}
            alt={photo.name}
            className="max-h-full max-w-full object-contain rounded shadow-2xl"
          />
        )}
      </div>

      {/* Info */}
      <div className="flex items-center justify-center gap-4 px-5 py-2 text-sm text-text-secondary">
        {photo && (
          <>
            <span>{photo.name}</span>
            {photo.date && <span>{photo.date}</span>}
            <span>已审阅: {reviewedCount} 张</span>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-5 py-4 border-t border-border">
        <button
          onClick={() => handleAction('skip')}
          className="px-5 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-hover transition-colors"
        >
          跳过 ↺
        </button>
        <button
          onClick={() => handleAction('keep')}
          className="px-6 py-2 rounded-lg bg-success-dim text-text font-semibold hover:bg-success transition-colors"
        >
          保留 ✓
        </button>
        <button
          onClick={() => handleAction('deleted')}
          className="px-6 py-2 rounded-lg bg-danger-dim text-text font-semibold hover:bg-danger transition-colors"
        >
          删除 ✗
        </button>
      </div>
    </div>
  )
}
