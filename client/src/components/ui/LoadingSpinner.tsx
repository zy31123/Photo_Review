export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-10 h-10 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
        <div className="absolute inset-0 w-10 h-10 border-2 border-accent/30 rounded-full spinner-pulse" />
      </div>
      <span className="text-text-secondary text-sm tracking-wide">加载中...</span>
    </div>
  )
}
