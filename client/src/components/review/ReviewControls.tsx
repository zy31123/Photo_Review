import { ChevronLeft, X, Check, ChevronRight } from 'lucide-react'
import { useReview } from '../../context/ReviewContext'
import ActionBtn from '../ui/ActionBtn'

export default function ReviewControls() {
  const { currentIndex, filteredPhotos, goTo, handleAction } = useReview()

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-2.5 bg-[#1D1D1F]/85 backdrop-blur-xl rounded-xl px-3 py-2 shadow-lg">
        <ActionBtn
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          label="上一张"
          shortcut="←"
          icon={ChevronLeft}
        />
        <div className="w-px h-5 bg-white/10" />
        <ActionBtn
          onClick={() => handleAction('deleted')}
          variant="danger"
          label="废片"
          shortcut="D"
          icon={X}
        />
        <ActionBtn
          onClick={() => handleAction('keep')}
          variant="success"
          label="保留"
          shortcut="空格"
          icon={Check}
        />
        <div className="w-px h-5 bg-white/10" />
        <ActionBtn
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex >= filteredPhotos.length - 1}
          label="下一张"
          shortcut="→"
          icon={ChevronRight}
        />
      </div>
    </div>
  )
}
