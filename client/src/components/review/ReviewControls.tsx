import { useReview } from '../../context/ReviewContext'

export default function ReviewControls() {
  const { currentIndex, filteredPhotos, goTo, handleAction } = useReview()

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-2xl px-3 py-2">
        <ActionBtn
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          label="上一张"
          shortcut="←"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </ActionBtn>

        <ActionBtn
          onClick={() => handleAction('deleted')}
          variant="danger"
          label="废片"
          shortcut="D"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </ActionBtn>

        <ActionBtn
          onClick={() => handleAction('keep')}
          variant="success"
          label="保留"
          shortcut="Space"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </ActionBtn>

        <ActionBtn
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex >= filteredPhotos.length - 1}
          label="下一张"
          shortcut="→"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </ActionBtn>
      </div>
    </div>
  )
}

function ActionBtn({
  onClick, disabled, variant, label, shortcut, children,
}: {
  onClick: () => void
  disabled?: boolean
  variant?: 'danger' | 'success'
  label: string
  shortcut: string
  children: React.ReactNode
}) {
  const colors = variant === 'danger'
    ? 'hover:bg-danger/20 hover:text-danger'
    : variant === 'success'
      ? 'hover:bg-success/20 hover:text-success'
      : 'hover:bg-white/10 hover:text-text'

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-text-secondary transition-all duration-150 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed ${colors}`}
        title={`${label} (${shortcut})`}
      >
        {children}
      </button>
      <span className="text-[9px] text-text-muted tabular-nums">{shortcut}</span>
    </div>
  )
}
