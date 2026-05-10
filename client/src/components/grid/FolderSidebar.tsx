import { FolderOpen, Folder } from 'lucide-react'
import { useGrid } from '../../context/GridContext'

export default function FolderSidebar() {
  const { subfolders, subfolderFilter, setSubfolderFilter, filteredPhotos, photos } = useGrid()

  return (
    <div className="w-56 shrink-0 border-r border-black/[0.06] bg-white/60 backdrop-blur-xl overflow-y-auto py-3 px-2">
      <button
        onClick={() => setSubfolderFilter(null)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors duration-200 border-l-[3px] ${
          !subfolderFilter
            ? 'border-accent bg-accent/8 text-accent font-medium'
            : 'border-transparent text-text-muted hover:bg-black/[0.03]'
        }`}
      >
        <FolderOpen className="size-4 shrink-0" />
        <span className="truncate">全部照片</span>
        <span className="ml-auto text-xs text-text-muted tabular-nums">{photos.length}</span>
      </button>

      {subfolders.length > 0 && (
        <div className="mt-2 space-y-0.5">
          <div className="px-3 py-1.5 text-xs font-medium text-text-muted">
            子文件夹
          </div>
          {subfolders.map(sf => (
            <button
              key={sf.path}
              onClick={() => setSubfolderFilter(subfolderFilter === sf.path ? null : sf.path)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors duration-200 border-l-[3px] ${
                subfolderFilter === sf.path
                  ? 'border-accent bg-accent/8 text-accent font-medium'
                  : 'border-transparent text-text-muted hover:bg-black/[0.03]'
              }`}
            >
              <Folder className="size-4 shrink-0" />
              <span className="truncate">{sf.name}</span>
              <span className="ml-auto text-xs text-text-muted tabular-nums">{sf.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
