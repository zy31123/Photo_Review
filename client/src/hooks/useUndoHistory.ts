import { useRef, useCallback } from 'react'
import { api, type PhotoGroup } from '../api'

export type UndoActionType = 'rating' | 'favorite' | 'review' | 'delete' | 'delete_batch'

export interface DeleteUndoItem {
  photoId: string
  photoData: PhotoGroup
  trashPaths: Record<string, string>
  previousReviewAction?: string | null
}

export interface UndoAction {
  type: UndoActionType
  photoId: string
  before: any
  after: any
  // Delete-specific fields
  photoData?: PhotoGroup
  trashPaths?: Record<string, string>
  previousReviewAction?: string | null
  // Batch delete fields
  items?: DeleteUndoItem[]
}

const MAX_UNDO = 50

export function useUndoHistory() {
  const stack = useRef<UndoAction[]>([])

  const push = useCallback((action: UndoAction) => {
    stack.current.push(action)
    if (stack.current.length > MAX_UNDO) {
      stack.current.shift()
    }
  }, [])

  const undo = useCallback(async (): Promise<UndoAction | null> => {
    const action = stack.current.pop()
    if (!action) return null

    try {
      switch (action.type) {
        case 'rating':
          await api.setRating(action.photoId, action.before as number)
          break
        case 'favorite':
          await api.setFavorite(action.photoId, action.before as boolean)
          break
        case 'review':
          if (action.before === null) {
            await api.deleteReview(action.photoId)
          } else if (action.before) {
            await api.submitReview(action.photoId, action.before, 'sequential')
          }
          break
        case 'delete':
          if (action.trashPaths) {
            await api.restorePhoto({
              photoId: action.photoId,
              trashPaths: action.trashPaths,
              previousReviewAction: action.previousReviewAction,
            })
          }
          break
        case 'delete_batch':
          if (action.items?.length) {
            await api.restorePhotos(
              action.items.map(item => ({
                photoId: item.photoId,
                trashPaths: item.trashPaths,
                previousReviewAction: item.previousReviewAction,
              }))
            )
          }
          break
      }
    } catch {
      stack.current.push(action)
      return null
    }

    return action
  }, [])

  const canUndo = useCallback(() => stack.current.length > 0, [])

  const clear = useCallback(() => {
    stack.current = []
  }, [])

  return { push, undo, canUndo, clear }
}
