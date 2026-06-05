import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timer, LayoutList } from 'lucide-react'
import { api, getActiveFolder } from '../api'
import { useApp } from '../context/AppContext'
import { RandomNavProvider } from '../context/RandomNavContext'
import { useRandomBatch } from '../hooks/useRandomBatch'
import { useExif } from '../hooks/useExif'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useDragImage } from '../hooks/useDragImage'
import { useImageZoom } from '../hooks/useImageZoom'
import NavBar from '../components/NavBar'
import RandomControls from '../components/random/RandomControls'
import BatchSelector from '../components/random/BatchSelector'
import PhotoDetailsView from '../components/review/PhotoDetailsView'
import ToolbarDivider from '../components/ui/ToolbarDivider'

export default function RandomPage() {
  const navigate = useNavigate()
  const { isLoaded } = useApp()
  const batch = useRandomBatch()
  const exif = useExif(batch.currentPhoto)
  const drag = useDragImage(batch.currentPhoto)
  const { resetZoom, zoomStyle, handleWheel: zoomWheel, handlers: zoomHandlers } = useImageZoom()
  const containerRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', zoomWheel, { passive: false })
    return () => el.removeEventListener('wheel', zoomWheel)
  }, [zoomWheel])

  const handleCacheDaysChange = async (days: number) => {
    setCacheDays(days)
    await api.updateSettings({ random_cache_days: String(days) })
  }

  const handleStart = () => {
    setStarted(true)
    batch.loadBatch()
  }

  const shortcuts = useMemo(() => ({
    onPrev: batch.goPrev,
    onNext: batch.goNext,
    onKeep: () => batch.handleAction('keep'),
    onDelete: () => batch.handleAction('deleted'),
    onSkip: () => batch.handleAction('skip'),
    onToggleRight: batch.toggleRightPanel,
  }), [batch.goPrev, batch.goNext, batch.handleAction, batch.toggleRightPanel])

  useKeyboardShortcuts(reviewing ? shortcuts : {})

  useEffect(() => { resetZoom() }, [batch.currentPhoto?.id, resetZoom])

  const rightW = 'clamp(18.75rem, 18vw, 27.5rem)'

  /** Loading spinner */
  const loadingView = (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  /** Batch complete — all photos in batch reviewed */
  const batchCompleteView = (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-text-secondary text-callout">本批照片已审阅完毕</p>
      <button
        onClick={() => batch.loadBatch()}
        className="h-10 px-10 rounded-full bg-accent text-white font-semibold text-callout hover:bg-accent-hover transition-colors duration-fast shadow-sm"
      >
        加载下一批
      </button>
    </div>
  )

  /** Start screen — not yet started */
  const startView = !started ? (
    <div className="flex items-center justify-center w-full h-full">
      <BatchSelector
        batchSize={batch.batchSize}
        onBatchSizeChange={batch.changeBatchSize}
        onStart={handleStart}
        loading={batch.loading}
        exhausted={batch.exhausted}
        sessionReviewed={batch.sessionReviewed}
      />
    </div>
  ) : null

  /** Toolbar — only when reviewing */
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

  return (
    <RandomNavProvider
      currentPhoto={batch.currentPhoto}
      batchReviewed={batch.batchReviewed}
      batchTotal={batch.batchTotal}
      sessionReviewed={batch.sessionReviewed}
      rightPanelOpen={batch.rightPanelOpen}
      onToggleRightPanel={batch.toggleRightPanel}
      cacheDays={cacheDays}
      onCacheDaysChange={handleCacheDaysChange}
    >
    <div className="h-screen flex flex-col bg-bg">
      <NavBar />

      {/* Toolbar: only when reviewing */}
      {toolbar}

      {batch.error && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-md bg-danger-subtle border border-danger/20 text-danger text-caption text-center">
          {batch.error}
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        {/* Start screen or photo viewer */}
        {startView || (
          <div
            ref={containerRef}
            className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#1D1D1F]"
          >
            {/* Sub-states inside viewer */}
            {batch.loading ? loadingView
              : batch.batchComplete && batch.photos.length === 0 ? batchCompleteView
              : !batch.currentPhoto ? loadingView
              : (
                <>
                  <img
                    key={batch.currentPhoto.id}
                    src={api.fullUrl(batch.currentPhoto.id)}
                    alt={batch.currentPhoto.name}
                    className="max-h-full max-w-full object-contain rounded-md"
                    style={{ ...zoomStyle, transformOrigin: '0 0' }}
                    {...drag}
                    onMouseDown={zoomHandlers.onMouseDown}
                    onMouseMove={zoomHandlers.onMouseMove}
                    onMouseUp={zoomHandlers.onMouseUp}
                    onMouseLeave={zoomHandlers.onMouseLeave}
                    onDoubleClick={zoomHandlers.onDoubleClick}
                  />
                  <RandomControls
                    canGoPrev={batch.canGoPrev}
                    canGoNext={batch.canGoNext}
                    onPrev={batch.goPrev}
                    onNext={batch.goNext}
                    onSkip={() => batch.handleAction('skip')}
                    onKeep={() => batch.handleAction('keep')}
                    onDelete={() => batch.handleAction('deleted')}
                  />

                  {/* Progress bar */}
                  {batch.batchTotal > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                      <div
                        className="h-full bg-accent/80 transition-all duration-slow"
                        style={{ width: `${(batch.batchReviewed / batch.batchTotal) * 100}%` }}
                      />
                    </div>
                  )}
                </>
              )}
          </div>
        )}

        {reviewing && batch.rightPanelOpen && batch.currentPhoto && (
          <div className="h-full bg-glass-thin backdrop-blur-xl border-l border-border-subtle overflow-y-auto" style={{ width: rightW, paddingRight: '0.75rem' }}>
            <PhotoDetailsView
              photo={batch.currentPhoto}
              exif={exif}
            />
          </div>
        )}
      </div>
    </div>
    </RandomNavProvider>
  )
}
