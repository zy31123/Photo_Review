import ActionBtn from '../ui/ActionBtn'

interface RandomControlsProps {
  canGoPrev: boolean
  canGoNext: boolean
  onPrev: () => void
  onNext: () => void
  onSkip: () => void
  onKeep: () => void
  onDelete: () => void
}

export default function RandomControls({
  canGoPrev, canGoNext, onPrev, onNext, onSkip, onKeep, onDelete,
}: RandomControlsProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-3 bg-black/50 backdrop-blur-xl rounded-full px-5 py-3 shadow-overlay">
        <ActionBtn onClick={onPrev} disabled={!canGoPrev} label="上一张" shortcut="←">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </ActionBtn>

        <ActionBtn onClick={onDelete} variant="danger" label="废片" shortcut="D">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </ActionBtn>

        <ActionBtn onClick={onKeep} variant="success" label="保留" shortcut="空格">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </ActionBtn>

        <ActionBtn onClick={onSkip} label="跳过" shortcut="R">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </ActionBtn>

        <ActionBtn onClick={onNext} disabled={!canGoNext} label="下一张" shortcut="→">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </ActionBtn>
      </div>
    </div>
  )
}
