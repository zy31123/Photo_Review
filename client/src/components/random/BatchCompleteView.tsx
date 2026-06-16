export default function BatchCompleteView({ onLoadMore }: { onLoadMore: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-text-secondary text-callout">本批照片已审阅完毕</p>
      <button
        onClick={onLoadMore}
        className="h-10 px-10 rounded-full bg-accent text-white font-semibold text-callout hover:bg-accent-hover transition-colors duration-fast shadow-sm"
      >
        加载下一批
      </button>
    </div>
  )
}
