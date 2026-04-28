import { useEffect } from 'react'

interface ShortcutMap {
  onPrev?: () => void
  onNext?: () => void
  onKeep?: () => void
  onDelete?: () => void
  onSkip?: () => void
  onToggleLeft?: () => void
  onToggleRight?: () => void
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
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
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [shortcuts])
}
