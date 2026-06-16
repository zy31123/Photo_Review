import { useEffect, useRef } from 'react'

interface ShortcutMap {
  onPrev?: () => void
  onNext?: () => void
  onKeep?: () => void
  onDelete?: () => void
  onSkip?: () => void
  onToggleLeft?: () => void
  onToggleRight?: () => void
  onRating?: (rating: number) => void
  onFavorite?: () => void
  onUndo?: () => void
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const s = shortcutsRef.current

      // Ctrl+Z / Cmd+Z: undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        s.onUndo?.()
        return
      }

      // F: toggle favorite
      if (e.key === 'f' || e.key === 'F') {
        s.onFavorite?.()
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          s.onPrev?.()
          break
        case 'ArrowRight':
          e.preventDefault()
          s.onNext?.()
          break
        case ' ':
          e.preventDefault()
          s.onKeep?.()
          break
        case 'd':
        case 'D':
          s.onDelete?.()
          break
        case 'r':
        case 'R':
          s.onSkip?.()
          break
        case '[':
          s.onToggleLeft?.()
          break
        case ']':
          s.onToggleRight?.()
          break
        default:
          if (e.key >= '1' && e.key <= '5' && s.onRating) {
            e.preventDefault()
            s.onRating(Number(e.key))
          }
          break
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])
}
