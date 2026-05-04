import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Image as ImageIcon } from 'lucide-react'
import { api, getActiveFolder } from '../api'
import { useApp } from '../context/AppContext'
import { useRandomBatch } from '../hooks/useRandomBatch'
import { useExif } from '../hooks/useExif'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import NavBar from '../components/NavBar'
import RandomToolbar from '../components/random/RandomToolbar'
import RandomControls from '../components/random/RandomControls'
import BatchSelector from '../components/random/BatchSelector'
import PhotoDetailsView from '../components/review/PhotoDetailsView'

export default function RandomPage() {
  const navigate = useNavigate()
  const { isLoaded } = useApp()
  const batch = useRandomBatch()
  const exif = useExif(batch.currentPhoto)
  const [cacheDays, setCacheDays] = useState(7)
  const [started, setStarted] = useState(false)

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

  const placeholder = batch.loading
    ? (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
    : batch.batchComplete && batch.photos.length === 0
      ? (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-text-secondary">所有照片已审阅完毕</p>
          <button
            onClick={() => batch.loadBatch()}
            className="px-4 py-2 rounded-lg bg-accent text-bg text-sm font-medium hover:bg-accent-dim transition-colors"
          >
            加载下一批
          </button>
        </div>
      )
      : <div className="flex flex-col items-center justify-center gap-6">
          <ImageIcon className="w-16 h-16 text-text-muted/30" />
          <div className="text-center">
            <p className="text-xl text-text-secondary mb-2">随机浏览你的照片</p>
            <p className="text-sm text-text-muted">选择一个批次大小，随机抽取照片进行审阅</p>
          </div>
          <BatchSelector
            batchSize={batch.batchSize}
            onBatchSizeChange={batch.changeBatchSize}
            onStart={handleStart}
            loading={batch.loading}
            exhausted={batch.exhausted}
            sessionReviewed={batch.sessionReviewed}
          />
        </div>

  return (
    <div className="h-screen flex flex-col bg-bg">
      <NavBar />
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

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 relative flex items-center justify-center bg-bg overflow-hidden">
          {!started || !batch.currentPhoto ? placeholder : (
            <>
              <img
                key={batch.currentPhoto.id}
                src={api.fullUrl(batch.currentPhoto.id)}
                alt={batch.currentPhoto.name}
                className="max-h-full max-w-full object-contain rounded shadow-2xl"
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
            </>
          )}
        </div>

        {batch.rightPanelOpen && batch.currentPhoto && (
          <div className="h-full bg-bg-deep border-l border-border/30 overflow-y-auto" style={{ width: rightW, paddingRight: 12 }}>
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
