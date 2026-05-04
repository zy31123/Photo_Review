import { useState, useCallback, useRef } from 'react'
import { api, type PhotoGroup } from '../api'

export function useRandomBatch() {
  const [photos, setPhotos] = useState<PhotoGroup[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [batchSize, setBatchSize] = useState(20)
  const [sessionReviewed, setSessionReviewed] = useState(0)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [exhausted, setExhausted] = useState(false)
  const [actionedSet, setActionedSet] = useState<Set<number>>(new Set())
  const [batchComplete, setBatchComplete] = useState(false)
  const processingRef = useRef(false)

  const currentPhoto = currentIndex >= 0 && currentIndex < photos.length ? photos[currentIndex] : null
  const batchReviewed = actionedSet.size
  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex < photos.length - 1

  const loadBatch = useCallback(async (size?: number) => {
    const count = size ?? batchSize
    setLoading(true)
    setError('')
    setBatchComplete(false)
    try {
      const result = await api.getRandomPhotos(count)
      if (result.photos.length === 0) {
        setExhausted(true)
        setPhotos([])
        setCurrentIndex(-1)
      } else {
        setExhausted(false)
        setPhotos(result.photos)
        setCurrentIndex(0)
        setActionedSet(new Set())
      }
    } catch (e: any) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [batchSize])

  const goTo = useCallback((index: number) => {
    if (index >= 0 && index < photos.length) {
      setCurrentIndex(index)
    }
  }, [photos.length])

  const goNext = useCallback(() => {
    goTo(currentIndex + 1)
  }, [currentIndex, goTo])

  const goPrev = useCallback(() => {
    goTo(currentIndex - 1)
  }, [currentIndex, goTo])

  const handleAction = useCallback(async (action: 'keep' | 'deleted' | 'skip') => {
    if (processingRef.current) return

    if (action === 'skip') {
      if (currentIndex < photos.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        setBatchComplete(true)
      }
      return
    }

    const photo = photos[currentIndex]
    if (!photo) return

    processingRef.current = true
    setError('')
    try {
      await api.submitReview(photo.id, action, 'random')
      setActionedSet(prev => new Set(prev).add(currentIndex))
      setSessionReviewed(prev => prev + 1)

      if (action === 'deleted') {
        const remaining = photos.filter(p => p.id !== photo.id)
        setPhotos(remaining)
        if (remaining.length === 0) {
          setBatchComplete(true)
        } else {
          const adjustedIndex = Math.min(currentIndex, remaining.length - 1)
          setCurrentIndex(Math.max(0, adjustedIndex))
        }
      } else if (currentIndex < photos.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        setBatchComplete(true)
      }
    } catch (e: any) {
      setError(e.message || '操作失败')
    } finally {
      processingRef.current = false
    }
  }, [photos, currentIndex])

  const changeBatchSize = useCallback((size: number) => {
    setBatchSize(size)
  }, [])

  const toggleRightPanel = useCallback(() => {
    setRightPanelOpen(prev => !prev)
  }, [])

  const dismissBatchComplete = useCallback(() => {
    setBatchComplete(false)
  }, [])

  return {
    photos,
    currentIndex,
    currentPhoto,
    loading,
    error,
    batchSize,
    sessionReviewed,
    rightPanelOpen,
    exhausted,
    batchReviewed,
    batchTotal: photos.length,
    canGoPrev,
    canGoNext,
    batchComplete,
    loadBatch,
    goTo,
    goNext,
    goPrev,
    handleAction,
    changeBatchSize,
    toggleRightPanel,
    dismissBatchComplete,
  }
}
