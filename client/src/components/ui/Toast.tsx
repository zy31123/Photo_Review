import { X } from 'lucide-react'
import type { ToastItem } from '../../hooks/useToast'

interface ToastContainerProps {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-xl bg-bg-elevated/95 backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] border border-border-subtle animate-fade-in"
        >
          <span className="text-text text-caption">{toast.message}</span>
          {toast.action && toast.onAction && (
            <button
              onClick={toast.onAction}
              className="text-accent text-caption font-semibold hover:text-accent-hover transition-colors duration-fast"
            >
              {toast.action}
            </button>
          )}
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-text-tertiary hover:text-text transition-colors duration-fast"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  )
}
