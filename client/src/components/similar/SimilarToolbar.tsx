import { Search, Trash2, BarChart3 } from 'lucide-react'
import { useSimilar } from '../../context/SimilarContext'

export default function SimilarToolbar() {
  const { status, result, stats, groups, selectedDeleteCount, analyze, deleteSelected } = useSimilar()

  return (
    <div className="h-12 bg-bg-deep border-b border-border/30 flex items-center px-4 shrink-0 gap-3">
      <button
        onClick={analyze}
        disabled={status === 'analyzing'}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Search className="size-4" />
        {status === 'analyzing' ? '分析中...' : '分析相似照片'}
      </button>

      {status === 'done' && result && (
        <div className="flex items-center gap-2 text-text-muted text-xs">
          <BarChart3 className="size-3.5" />
          <span>
            新计算 {result.computed} 张，跳过 {result.skipped} 张
          </span>
          <span className="text-border">|</span>
          <span className="text-text-secondary">
            找到 {groups.length} 个相似组，涉及 {result.totalPhotos} 张照片
          </span>
        </div>
      )}

      {stats && status === 'idle' && (
        <div className="flex items-center gap-2 text-text-muted text-xs">
          <BarChart3 className="size-3.5" />
          <span>已分析 {stats.analyzed}/{stats.total} 张，{stats.groups} 个相似组</span>
        </div>
      )}

      {selectedDeleteCount > 0 && (
        <button
          onClick={deleteSelected}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
        >
          <Trash2 className="size-4" />
          删除选中的 {selectedDeleteCount} 张
        </button>
      )}
    </div>
  )
}
