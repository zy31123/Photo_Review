import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timer, LayoutList } from 'lucide-react'
import { api, getActiveFolder } from '../api'
import { useApp } from '../context/AppContext'
import { useRandomBatch } from '../hooks/useRandomBatch'
import { useExif } from '../hooks/useExif'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import NavBar from '../components/NavBar'
import StartView from '../components/random/StartView'
import BatchViewer from '../components/random/BatchViewer'
import BatchCompleteView from '../components/random/BatchCompleteView'
import PhotoDetailsView from '../components/review/PhotoDetailsView'
import LoadingScreen from '../components/ui/LoadingScreen'
import ToolbarDivider from '../components/ui/ToolbarDivider'

export default function RandomPage() {
  const navigate = useNavigate()
  const { isLoaded, updatePhotoRating, updatePhotoFavorite, undoLastAction } = useApp()
  const batch = useRandomBatch()
  const exif = useExif(batch.currentPhoto)
  const [cacheDays, setCacheDays] = useState(7)
  const [started, setStarted] = useState(false)

  const reviewing = started && batch.currentPhoto

  useEffect(() => {
    if (!isLoaded && !getActiveFolder()) navigate('/')
  }, [navigate, isLoaded])

  useEffect(() => {
    api.getSettings().then(s => {
      if (s.random_cache_days) setCacheDays(Number(s.random_cache_days))
    })
  }, [])

  const handleCacheDaysChange = async (days: number) => {
    setCacheDays(days)
    await api.updateSettings({ random_cache_days: String(days) })
  }

  const handleStart = () => {
    setStarted(true)
    batch.loadBatch()
  }

  // useKeyboardShortcuts uses useRef internally — no useMemo needed
  useKeyboardShortcuts(reviewing ? {
    onPrev: batch.goPrev,
    onNext: batch.goNext,
    onKeep: () => batch.handleAction('keep'),
    onDelete: () => batch.handleAction('deleted'),
    onSkip: () => batch.handleAction('skip'),
    onToggleRight: batch.toggleRightPanel,
    onRating: (rating: number) => { if (batch.currentPhoto) updatePhotoRating(batch.currentPhoto.id, rating) },
    onFavorite: () => { if (batch.currentPhoto) updatePhotoFavorite(batch.currentPhoto.id) },
    onUndo: undoLastAction,
  } : {})

  const rightW = 'clamp(18.75rem, 18vw, 27.5rem)'

  const toolbar = reviewing && (
    <div className="h-[var(--toolbar-height)] border-b border-border-subtle bg-glass backdrop-blur-xl flex items-center px-4 gap-3 shrink-0">
      <span className="text-text-secondary text-caption font-mono truncate max-w-[10rem]">
        {batch.currentPhoto?.name || ''}
      </span>
      <ToolbarDivider />
      {batch.batchTotal > 0 && (
        <span className="text-text-tertiary text-caption tabular-nums">
          <span className="text-text font-medium">{batch.batchReviewed}</span>
          <span className="mx-0.5 text-text-tertiary/60">/</span>
          <span>{batch.batchTotal}</span>
        </span>
      )}
      {batch.sessionReviewed > 0 && (
        <span className="text-text-tertiary text-micro tabular-nums">
          本次已审阅 {batch.sessionReviewed}
        </span>
      )}
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Timer className="size-3 text-text-tertiary" strokeWidth={1.5} />
          <span className="text-text-tertiary text-micro">缓存</span>
          <select
            value={cacheDays}
            onChange={e => handleCacheDaysChange(Number(e.target.value))}
            className="bg-fill-subtle border border-border-subtle rounded-sm px-2 py-1 text-text-secondary text-micro focus:outline-none focus:border-accent/50 transition-colors duration-fast"
          >
            <option value={7}>7 天</option>
            <option value={30}>30 天</option>
          </select>
        </div>
        <button
          onClick={batch.toggleRightPanel}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-fast ${
            batch.rightPanelOpen ? 'text-accent bg-accent-subtle' : 'text-text-tertiary hover:text-text-secondary hover:bg-fill-subtle'
          }`}
          title="详细信息 ( ] )"
        >
          <LayoutList className="size-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )

  const mainContent = !started
    ? <StartView batchSize={batch.batchSize} onBatchSizeChange={batch.changeBatchSize} onStart={handleStart} loading={batch.loading} exhausted={batch.exhausted} sessionReviewed={batch.sessionReviewed} />
    : batch.loading ? <LoadingScreen />
    : batch.batchComplete && batch.photos.length === 0 ? <BatchCompleteView onLoadMore={() => batch.loadBatch()} />
    : !batch.currentPhoto ? <LoadingScreen />
    : <BatchViewer
        photo={batch.currentPhoto}
        batchReviewed={batch.batchReviewed}
        batchTotal={batch.batchTotal}
        canGoPrev={batch.canGoPrev}
        canGoNext={batch.canGoNext}
        rating={batch.currentPhoto?.rating ?? 0}
        favorite={batch.currentPhoto?.favorite ?? false}
        onPrev={batch.goPrev}
        onNext={batch.goNext}
        onSkip={() => batch.handleAction('skip')}
        onKeep={() => batch.handleAction('keep')}
        onDelete={() => batch.handleAction('deleted')}
        onRating={(rating: number) => { if (batch.currentPhoto) updatePhotoRating(batch.currentPhoto.id, rating) }}
        onFavorite={() => { if (batch.currentPhoto) updatePhotoFavorite(batch.currentPhoto.id) }}
      />

  return (
    <div className="h-screen flex flex-col bg-bg">
      <NavBar />
      {toolbar}

      {batch.error && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-md bg-danger-subtle border border-danger/20 text-danger text-caption text-center">
          {batch.error}
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        {mainContent}

        {reviewing && batch.rightPanelOpen && batch.currentPhoto && (
          <div className="h-full bg-glass-thin backdrop-blur-xl border-l border-border-subtle overflow-y-auto" style={{ width: rightW, paddingRight: '0.75rem' }}>
            <PhotoDetailsView photo={batch.currentPhoto} exif={exif} />
          </div>
        )}
      </div>
    </div>
  )
}
