import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type PhotoGroup } from '../api'

export default function ReviewPage() {
  const navigate = useNavigate()
  const [photos, setPhotos] = useState<PhotoGroup[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [transition, setTransition] = useState<'none' | 'in'>('none')

  const currentPhoto = photos[currentIndex]

  const loadPhotos = async () => {
    try {
      const result = await api.getPhotos({ sort: 'time', limit: 2000 })
      setPhotos(result.photos)
    } catch {
      // will show empty state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPhotos() }, [])

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= photos.length) return
    setTransition('none')
    setCurrentIndex(index)
    requestAnimationFrame(() => setTransition('in'))
  }, [photos.length])

  const handleAction = async (action: 'keep' | 'deleted') => {
    if (!currentPhoto) return
    try {
      if (action === 'deleted') {
        await api.deletePhoto(currentPhoto.id)
      }
      await api.submitReview(currentPhoto.id, action, 'sequential')
      goTo(currentIndex + 1)
    } catch {
      // handle error silently for now
    }
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goTo(currentIndex - 1)
      else if (e.key === 'ArrowRight') goTo(currentIndex + 1)
      else if (e.key === ' ') { e.preventDefault(); handleAction('keep') }
      else if (e.key === 'd' || e.key === 'D') handleAction('deleted')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [currentIndex, currentPhoto, photos.length])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-text-secondary">
        加载中...
      </div>
    )
  }

  if (!photos.length) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-text-secondary">
        <p className="text-lg mb-4">暂无照片</p>
        <button onClick={() => navigate('/')} className="text-accent hover:underline">
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <button onClick={() => navigate('/')} className="text-text-muted hover:text-text text-sm">
          ← 返回
        </button>
        <span className="text-text-secondary text-sm font-body">
          {currentPhoto?.name || ''}
        </span>
        <span className="text-text-muted text-sm">
          {currentIndex + 1} / {photos.length}
        </span>
      </div>

      {/* Main Image */}
      <div className="flex-1 flex items-center justify-center px-6 py-4 overflow-hidden">
        {currentPhoto?.hasJpg ? (
          <img
            src={api.fullUrl(currentPhoto.id)}
            alt={currentPhoto.name}
            className={`max-h-full max-w-full object-contain rounded shadow-2xl transition-opacity duration-300 ${transition === 'in' ? 'opacity-100' : 'opacity-100'}`}
          />
        ) : (
          <div className="text-text-muted">无预览 (仅 RAW)</div>
        )}
      </div>

      {/* Info Bar */}
      <div className="flex items-center justify-center gap-6 px-5 py-2 text-sm text-text-secondary">
        <span className={currentPhoto?.hasRaw ? 'text-success' : 'text-danger'}>
          RAW {currentPhoto?.hasRaw ? '配对 ✓' : '缺失 ✗'}
        </span>
        {currentPhoto?.date && <span>{currentPhoto.date}</span>}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-5 py-4 border-t border-border">
        <button
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← 上一张
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
          废片 ✗
        </button>
        <button
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex >= photos.length - 1}
          className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          下一张 →
        </button>
      </div>

      {/* Thumbnail Strip */}
      <div className="flex gap-1 px-4 py-2 border-t border-border overflow-x-auto">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => goTo(i)}
            className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all ${
              i === currentIndex
                ? 'border-accent'
                : 'border-transparent opacity-50 hover:opacity-80'
            }`}
          >
            {photo.hasJpg ? (
              <img src={api.thumbnailUrl(photo.id)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-bg-card flex items-center justify-center text-text-muted text-xs">
                RAW
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
