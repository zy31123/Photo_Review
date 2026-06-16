import BatchSelector from './BatchSelector'

interface StartViewProps {
  batchSize: number
  onBatchSizeChange: (size: number) => void
  onStart: () => void
  loading: boolean
  exhausted: boolean
  sessionReviewed: number
}

export default function StartView({
  batchSize, onBatchSizeChange, onStart, loading, exhausted, sessionReviewed,
}: StartViewProps) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <BatchSelector
        batchSize={batchSize}
        onBatchSizeChange={onBatchSizeChange}
        onStart={onStart}
        loading={loading}
        exhausted={exhausted}
        sessionReviewed={sessionReviewed}
      />
    </div>
  )
}
