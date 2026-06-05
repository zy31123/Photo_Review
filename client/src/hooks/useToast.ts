import { useState, useCallback, useRef } from 'react'

export interface ToastItem {
  id: number
  message: string
  action?: string
  onAction?: () => void
}

let nextId = 0

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const show = useCallback((message: string, duration = 3000, action?: { label: string; onClick: () => void }) => {
    const id = nextId++
    const item: ToastItem = { id, message, action: action?.label, onAction: action?.onClick }
    setToasts(prev => [...prev, item])
    timers.current.set(id, setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      timers.current.delete(id)
    }, duration))
    return id
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  return { toasts, show, dismiss }
}
