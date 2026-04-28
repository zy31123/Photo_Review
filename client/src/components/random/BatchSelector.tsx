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
          <p className="text-text-secondary text-lg mb-2">
            {sessionReviewed > 0 ? '所有照片已审阅完毕' : '暂无可用的照片'}
          </p>
          {sessionReviewed > 0 && (
            <p className="text-text-muted text-sm mb-6">本次共审阅 {sessionReviewed} 张</p>
          )}
        </>
      ) : (
        <>
          <p className="text-text-secondary text-lg mb-4">选择每批浏览数量</p>
          <div className="flex items-center justify-center gap-3 mb-6">
            {SIZES.map(size => (
              <button
                key={size}
                onClick={() => onBatchSizeChange(size)}
                className={`w-14 h-14 rounded-xl text-lg font-display transition-all duration-150 ${
                  batchSize === size
                    ? 'bg-accent text-bg font-bold'
                    : 'bg-bg-card border border-border text-text-secondary hover:border-accent hover:text-text'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </>
      )}

      {!exhausted && (
        <button
          onClick={onStart}
          disabled={loading}
          className="px-8 py-3 rounded-xl bg-accent text-bg font-display font-bold text-base hover:brightness-110 transition-all disabled:opacity-50"
        >
          {loading ? '加载中...' : '开始浏览'}
        </button>
      )}
    </div>
  )
}
