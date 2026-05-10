import { Shuffle } from 'lucide-react'

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
          <svg className="w-10 h-10 text-success mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-text-secondary text-lg mb-2">
            {sessionReviewed > 0 ? '所有照片已审阅完毕' : '暂无可用的照片'}
          </p>
          {sessionReviewed > 0 && (
            <p className="text-text-muted text-sm mb-6">本次共审阅 {sessionReviewed} 张</p>
          )}
        </>
      ) : (
        <div className="inline-block bg-white/60 backdrop-blur-xl rounded-2xl border border-black/[0.04] shadow-card px-10 py-8 max-w-lg mx-auto">
          <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-full bg-accent/5 mb-6 mx-auto">
            <Shuffle className="w-14 h-14 text-accent/40" />
          </div>
          <p className="text-text-secondary text-lg mb-5">选择每批浏览数量</p>
          <div className="flex items-center justify-center gap-5 mb-8">
            {SIZES.map(size => (
              <button
                key={size}
                onClick={() => onBatchSizeChange(size)}
                className={`w-[4.5rem] h-[4.5rem] rounded-2xl text-xl font-semibold transition-all duration-200 ${
                  batchSize === size
                    ? 'bg-accent text-white font-bold shadow-md shadow-accent/20'
                    : 'bg-black/[0.04] text-text-secondary hover:bg-black/[0.06] hover:text-text'
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
          className="px-14 py-4 rounded-2xl bg-accent text-white font-semibold text-base hover:bg-accent-dim hover:shadow-lg hover:shadow-accent/15 transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          {loading ? '加载中...' : '开始浏览'}
        </button>
      )}
    </div>
  )
}
