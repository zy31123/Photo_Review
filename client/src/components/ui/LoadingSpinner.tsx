export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <span className="text-text-muted text-sm tracking-wide">加载中...</span>
    </div>
  )
}
