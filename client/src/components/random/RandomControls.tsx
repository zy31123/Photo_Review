import { ChevronLeft, X, Check, RefreshCw, ChevronRight } from 'lucide-react'
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
      <div className="flex items-center gap-4 bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl px-5 py-3">
        <ActionBtn onClick={onPrev} disabled={!canGoPrev} label="上一张" shortcut="←" icon={ChevronLeft} />
        <ActionBtn onClick={onDelete} variant="danger" label="废片" shortcut="D" icon={X} />
        <ActionBtn onClick={onKeep} variant="success" label="保留" shortcut="空格" icon={Check} />
        <ActionBtn onClick={onSkip} label="跳过" shortcut="R" icon={RefreshCw} />
        <ActionBtn onClick={onNext} disabled={!canGoNext} label="下一张" shortcut="→" icon={ChevronRight} />
      </div>
    </div>
  )
}
