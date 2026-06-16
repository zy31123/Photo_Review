import { useCallback } from 'react'
import { api, type PhotoGroup } from '../api'
import { useUndoHistory, type UndoAction } from './useUndoHistory'

/**
 * Encapsulates undo logic for photo operations.
 * Moved out of AppContext to keep it focused on data management.
 */
export function useUndoEngine(
  setPhotos: React.Dispatch<React.SetStateAction<PhotoGroup[]>>,
  toastShow: (message: string, duration?: number, action?: { label: string; onClick: () => void }) => void,
) {
  // Destructure stable callbacks — useUndoHistory returns a new object each render,
  // but push/undo/clear are individually memoized with useCallback([], []).
  const { push: pushAction, undo: popAction, clear: clearAction } = useUndoHistory()

  const undoLastAction = useCallback(async (): Promise<UndoAction | null> => {
    const action = await popAction()
    if (!action) return null

    switch (action.type) {
      case 'rating':
      case 'favorite':
      case 'review': {
        setPhotos(prev => prev.map(p => {
          if (p.id !== action.photoId) return p
          switch (action.type) {
            case 'rating': return { ...p, rating: action.before as number }
            case 'favorite': return { ...p, favorite: action.before as boolean }
            case 'review': return { ...p, reviewAction: action.before ?? null }
            default: return p
          }
        }))

        // For review undo: if the photo was removed from list (random mode delete), re-add it
        if (action.type === 'review' && action.photoData) {
          setPhotos(prev => {
            if (prev.find(p => p.id === action.photoId)) return prev
            return [...prev, { ...action.photoData!, reviewAction: action.before ?? null }]
          })
        }

        const typeLabels: Record<string, string> = { rating: '评分', favorite: '收藏', review: '审阅' }
        toastShow(`已撤销: ${typeLabels[action.type]}`)
        break
      }

      case 'delete': {
        try {
          const result = await api.getPhotos({ limit: 5000 })
          const restoredPhoto = result.photos.find(p => p.id === action.photoId)
          if (restoredPhoto) {
            setPhotos(prev => {
              if (prev.find(p => p.id === action.photoId)) return prev
              return [...prev, restoredPhoto]
            })
          }
        } catch {
          if (action.photoData) {
            setPhotos(prev => {
              if (prev.find(p => p.id === action.photoId)) return prev
              return [...prev, action.photoData!]
            })
          }
        }
        toastShow(`已恢复: ${action.photoData?.name || '照片'}`)
        break
      }

      case 'delete_batch': {
        const count = action.items?.length ?? 0
        try {
          const result = await api.getPhotos({ limit: 5000 })
          const restoredIds = new Set(action.items?.map(i => i.photoId) ?? [])
          const restoredPhotos = result.photos.filter(p => restoredIds.has(p.id))
          if (restoredPhotos.length > 0) {
            setPhotos(prev => {
              const existingIds = new Set(prev.map(p => p.id))
              const newPhotos = restoredPhotos.filter(p => !existingIds.has(p.id))
              if (newPhotos.length === 0) return prev
              return [...prev, ...newPhotos]
            })
          }
        } catch {
          if (action.items) {
            const restoredPhotos = action.items.map(i => i.photoData)
            setPhotos(prev => {
              const existingIds = new Set(prev.map(p => p.id))
              const newPhotos = restoredPhotos.filter(p => !existingIds.has(p.id))
              if (newPhotos.length === 0) return prev
              return [...prev, ...newPhotos]
            })
          }
        }
        toastShow(`已恢复 ${count} 张照片`)
        break
      }
    }

    return action
  }, [popAction, setPhotos, toastShow])

  const pushUndo = useCallback((action: UndoAction) => {
    pushAction(action)
  }, [pushAction])

  return { undoLastAction, pushUndo, clearUndo: clearAction }
}
