import { useReview } from '../../context/ReviewContext'
import ActionBtn from '../ui/ActionBtn'

export default function ReviewControls() {
  const { currentIndex, filteredPhotos, goTo, handleAction } = useReview()

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl rounded-full px-5 py-3 shadow-overlay">
        <ActionBtn
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          label="上一张"
          shortcut="←"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </ActionBtn>

        <ActionBtn
          onClick={() => handleAction('deleted')}
          variant="danger"
          label="废片"
          shortcut="D"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </ActionBtn>

        <ActionBtn
          onClick={() => handleAction('keep')}
          variant="success"
          label="保留"
          shortcut="空格"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </ActionBtn>

        <ActionBtn
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex >= filteredPhotos.length - 1}
          label="下一张"
          shortcut="→"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </ActionBtn>
      </div>
    </div>
  )
}
