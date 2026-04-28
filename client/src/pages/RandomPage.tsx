import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getActiveFolder, type ExifData } from '../api'
import { useRandomBatch } from '../hooks/useRandomBatch'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import RandomToolbar from '../components/random/RandomToolbar'
import RandomControls from '../components/random/RandomControls'
import BatchSelector from '../components/random/BatchSelector'
import PhotoDetailsView from '../components/review/PhotoDetailsView'

export default function RandomPage() {
  const navigate = useNavigate()
  const batch = useRandomBatch()
  const [exif, setExif] = useState<ExifData | null>(null)
  const [cacheDays, setCacheDays] = useState(7)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!getActiveFolder()) navigate('/')
  }, [navigate])

  useEffect(() => {
    api.getSettings().then(s => {
      if (s.random_cache_days) setCacheDays(Number(s.random_cache_days))
    })
  }, [])

  useEffect(() => {
    if (!batch.currentPhoto) { setExif(null); return }
    let cancelled = false
    api.getExif(batch.currentPhoto.id).then(data => {
      if (!cancelled) setExif(data)
    })
    return () => { cancelled = true }
  }, [batch.currentPhoto])

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

  useKeyboardShortcuts(started && batch.currentPhoto ? shortcuts : {})

  const rightW = 'clamp(300px, 18vw, 440px)'
  const gridCols = batch.rightPanelOpen && batch.currentPhoto
    ? `1fr ${rightW}`
    : '1fr 0px'

  return (
    <div className="h-screen flex flex-col bg-bg">
      <RandomToolbar
        currentPhoto={batch.currentPhoto}
        batchReviewed={batch.batchReviewed}
        batchTotal={batch.batchTotal}
        sessionReviewed={batch.sessionReviewed}
        rightPanelOpen={batch.rightPanelOpen}
        onToggleRightPanel={batch.toggleRightPanel}
        cacheDays={cacheDays}
        onCacheDaysChange={handleCacheDaysChange}
      />

      {batch.error && (
        <div className="mx-5 mt-2 px-4 py-2 rounded-lg bg-danger/20 border border-danger/40 text-danger text-sm text-center">
          {batch.error}
        </div>
      )}

      <div
        className="flex-1 min-h-0"
        style={{ display: 'grid', gridTemplateColumns: gridCols, columnGap: 8 }}
      >
        {/* Image area */}
        <div className="relative flex items-center justify-center bg-bg overflow-hidden">
          {!started || !batch.currentPhoto ? (
            batch.loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-text-muted text-sm tracking-wide">加载中...</span>
              </div>
            ) : (
              <BatchSelector
                batchSize={batch.batchSize}
                onBatchSizeChange={batch.changeBatchSize}
                onStart={handleStart}
                loading={batch.loading}
                exhausted={batch.exhausted}
                sessionReviewed={batch.sessionReviewed}
              />
            )
          ) : (
            <>
              <img
                key={batch.currentPhoto.id}
                src={api.fullUrl(batch.currentPhoto.id)}
                alt={batch.currentPhoto.name}
                className="max-h-full max-w-full object-contain rounded shadow-2xl"
              />
              <RandomControls
                currentIndex={batch.currentIndex}
                batchTotal={batch.batchTotal}
                onPrev={batch.goPrev}
                onNext={batch.goNext}
                onSkip={() => batch.handleAction('skip')}
                onKeep={() => batch.handleAction('keep')}
                onDelete={() => batch.handleAction('deleted')}
              />
            </>
          )}
        </div>

        {/* Details panel */}
        {batch.rightPanelOpen && batch.currentPhoto && (
          <div className="h-full bg-bg-deep border-l border-border/30 overflow-y-auto" style={{ paddingRight: 12 }}>
            <PhotoDetailsView
              photo={batch.currentPhoto}
              exif={exif}
            />
          </div>
        )}
      </div>
    </div>
  )
}
