import { useEffect } from 'react'

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
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // Ctrl+Z / Cmd+Z: undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        shortcuts.onUndo?.()
        return
      }

      // F: toggle favorite
      if (e.key === 'f' || e.key === 'F') {
        shortcuts.onFavorite?.()
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          shortcuts.onPrev?.()
          break
        case 'ArrowRight':
          e.preventDefault()
          shortcuts.onNext?.()
          break
        case ' ':
          e.preventDefault()
          shortcuts.onKeep?.()
          break
        case 'd':
        case 'D':
          shortcuts.onDelete?.()
          break
        case 'r':
        case 'R':
          shortcuts.onSkip?.()
          break
        case '[':
          shortcuts.onToggleLeft?.()
          break
        case ']':
          shortcuts.onToggleRight?.()
          break
        default:
          if (e.key >= '1' && e.key <= '5' && shortcuts.onRating) {
            e.preventDefault()
            shortcuts.onRating(Number(e.key))
          }
          break
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [shortcuts])
}
