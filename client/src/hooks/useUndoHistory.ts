import { useRef, useCallback } from 'react'
import { api } from '../api'

export type UndoActionType = 'rating' | 'favorite' | 'review'

export interface UndoAction {
  type: UndoActionType
  photoId: string
  before: any
  after: any
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
          if (action.before) {
            await api.submitReview(action.photoId, action.before, 'sequential')
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
