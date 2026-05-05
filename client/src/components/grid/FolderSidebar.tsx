import { FolderOpen, Folder } from 'lucide-react'
import { useGrid } from '../../context/GridContext'

export default function FolderSidebar() {
  const { subfolders, subfolderFilter, setSubfolderFilter, filteredPhotos, photos } = useGrid()

  return (
    <div className="w-48 shrink-0 border-r border-border bg-bg-deep overflow-y-auto py-3 px-2">
      <button
        onClick={() => setSubfolderFilter(null)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          !subfolderFilter
            ? 'bg-accent/10 text-accent font-medium'
            : 'text-text-secondary hover:bg-bg-hover'
        }`}
      >
        <FolderOpen className="size-4" />
        <span className="truncate">全部照片</span>
        <span className="ml-auto text-xs text-text-muted tabular-nums">{photos.length}</span>
      </button>

      {subfolders.length > 0 && (
        <div className="mt-2 space-y-0.5">
          <div className="px-3 py-1 text-[0.6875rem] font-medium text-text-muted uppercase tracking-wide">
            子文件夹
          </div>
          {subfolders.map(sf => (
            <button
              key={sf.path}
              onClick={() => setSubfolderFilter(subfolderFilter === sf.path ? null : sf.path)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                subfolderFilter === sf.path
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <Folder className="size-3.5" />
              <span className="truncate">{sf.name}</span>
              <span className="ml-auto text-xs text-text-muted tabular-nums">{sf.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
