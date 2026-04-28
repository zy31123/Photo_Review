interface RandomControlsProps {
  currentIndex: number
  batchTotal: number
  onPrev: () => void
  onNext: () => void
  onSkip: () => void
  onKeep: () => void
  onDelete: () => void
}

export default function RandomControls({
  currentIndex, batchTotal, onPrev, onNext, onSkip, onKeep, onDelete,
}: RandomControlsProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-4 bg-black/50 backdrop-blur-md rounded-2xl px-6 py-4">
        <ActionBtn onClick={onPrev} disabled={currentIndex === 0} label="上一张" shortcut="←">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </ActionBtn>

        <ActionBtn onClick={onDelete} variant="danger" label="废片" shortcut="D">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </ActionBtn>

        <ActionBtn onClick={onKeep} variant="success" label="保留" shortcut="空格">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </ActionBtn>

        <ActionBtn onClick={onSkip} label="跳过" shortcut="R">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </ActionBtn>

        <ActionBtn onClick={onNext} disabled={currentIndex >= batchTotal - 1} label="下一张" shortcut="→">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-16 h-16 rounded-full flex items-center justify-center text-text-secondary transition-all duration-150 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed ${colors}`}
        title={`${label} (${shortcut})`}
      >
        {children}
      </button>
      <span className="text-sm text-text-muted tabular-nums">{label} ({shortcut})</span>
    </div>
  )
}
