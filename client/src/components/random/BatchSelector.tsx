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
  if (exhausted) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle className="size-8 text-success" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-text text-title-2 font-semibold mb-1">
            {sessionReviewed > 0 ? '所有照片已审阅完毕' : '暂无可用的照片'}
          </p>
          {sessionReviewed > 0 && (
            <p className="text-text-tertiary text-caption">本次共审阅 {sessionReviewed} 张</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 bg-bg-elevated rounded-2xl shadow-card p-8">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shadow-sm">
        <Shuffle className="w-10 h-10 text-accent/60" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <div className="text-center">
        <p className="text-text font-bold tracking-tight mb-1" style={{ fontSize: 'var(--text-title-1)' }}>随机浏览你的照片</p>
        <p className="text-text-secondary" style={{ fontSize: 'var(--text-body)' }}>随机抽取一批照片，快速审阅筛选</p>
      </div>

      {/* Batch size pills */}
      <div className="flex items-center gap-2">
        {SIZES.map(size => (
          <button
            key={size}
            onClick={() => onBatchSizeChange(size)}
            className={`h-9 px-5 rounded-full text-callout font-medium transition-all duration-fast active:scale-[0.97] ${
              batchSize === size
                ? 'bg-accent text-white shadow-sm'
                : 'bg-fill-subtle text-text-secondary hover:bg-fill hover:text-text'
            }`}
          >
            {size}
          </button>
        ))}
      </div>

      <p className="text-text-tertiary text-micro -mt-3">每批浏览数量</p>

      {/* Start button */}
      <button
        onClick={onStart}
        disabled={loading}
        className="h-11 px-12 rounded-xl bg-accent text-white font-semibold text-body hover:bg-accent-hover transition-all duration-fast disabled:opacity-50 shadow-card active:scale-[0.97]"
      >
        {loading ? '加载中...' : '开始浏览'}
      </button>
    </div>
  )
}
