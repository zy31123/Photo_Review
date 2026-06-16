interface LoadingScreenProps {
  message?: string
}

export default function LoadingScreen({ message = '加载中...' }: LoadingScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-text-secondary text-caption">{message}</span>
      </div>
    </div>
  )
}
