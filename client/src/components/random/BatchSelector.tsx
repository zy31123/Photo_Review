import { Shuffle, CheckCircle } from 'lucide-react'

interface BatchSelectorProps {
  batchSize: number
  onBatchSizeChange: (size: number) => void
  onStart: () => void
  loading: boolean
  exhausted: boolean
  sessionReviewed: number
}

const SIZES = [10, 20, 50, 100]

export default function BatchSelector({
  batchSize, onBatchSizeChange, onStart, loading, exhausted, sessionReviewed,
}: BatchSelectorProps) {
  return (
    <div className="text-center">
      {exhausted ? (
        <>
          <CheckCircle className="size-10 text-success mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-text-secondary text-title-2 mb-2">
            {sessionReviewed > 0 ? '所有照片已审阅完毕' : '暂无可用的照片'}
          </p>
          {sessionReviewed > 0 && (
            <p className="text-text-tertiary text-caption mb-5">本次共审阅 {sessionReviewed} 张</p>
          )}
        </>
      ) : (
        <div className="inline-block bg-bg-elevated rounded-md border border-border px-8 py-6 max-w-lg mx-auto">
          <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-md bg-accent-subtle mb-5 mx-auto">
            <Shuffle className="w-12 h-12 text-accent/40" />
          </div>
          <p className="text-text-secondary text-caption mb-4">选择每批浏览数量</p>
          <div className="flex items-center justify-center gap-4 mb-6">
            {SIZES.map(size => (
              <button
                key={size}
                onClick={() => onBatchSizeChange(size)}
                className={`w-16 h-16 rounded-md text-body font-semibold transition-colors duration-fast ${
                  batchSize === size
                    ? 'bg-accent text-white font-bold'
                    : 'bg-fill-subtle text-text-secondary hover:bg-fill hover:text-text'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {!exhausted && (
        <button
          onClick={onStart}
          disabled={loading}
          className="px-10 py-2.5 rounded-md bg-accent text-white font-semibold text-caption hover:bg-accent-hover transition-colors duration-fast disabled:opacity-50"
        >
          {loading ? '加载中...' : '开始浏览'}
        </button>
      )}
    </div>
  )
}
