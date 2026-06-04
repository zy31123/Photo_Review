import { FolderOpen, Folder } from 'lucide-react'
import { useGrid } from '../../context/GridContext'

export default function FolderSidebar() {
  const { subfolders, subfolderFilter, setSubfolderFilter, filteredPhotos, photos } = useGrid()

  return (
    <div className="w-56 shrink-0 border-r border-border-subtle bg-glass-thin backdrop-blur-xl overflow-y-auto py-3 px-3">
      <button
        onClick={() => setSubfolderFilter(null)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-sm text-caption transition-colors duration-fast border-l-2 ${
          !subfolderFilter
            ? 'border-accent bg-accent-subtle text-accent font-medium'
            : 'border-transparent text-text-secondary hover:bg-fill-subtle'
        }`}
      >
        <FolderOpen className="size-4 shrink-0" />
        <span className="truncate">全部照片</span>
        <span className="ml-auto text-micro text-text-tertiary tabular-nums">{photos.length}</span>
      </button>

      {subfolders.length > 0 && (
        <div className="mt-2 space-y-0.5">
          <div className="px-3 py-2 text-micro font-medium text-text-tertiary uppercase tracking-wider">
            子文件夹
          </div>
          {subfolders.map(sf => (
            <button
              key={sf.path}
              onClick={() => setSubfolderFilter(subfolderFilter === sf.path ? null : sf.path)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-sm text-caption transition-colors duration-fast border-l-2 ${
                subfolderFilter === sf.path
                  ? 'border-accent bg-accent-subtle text-accent font-medium'
                  : 'border-transparent text-text-secondary hover:bg-fill-subtle'
              }`}
            >
              <Folder className="size-4 shrink-0" />
              <span className="truncate">{sf.name}</span>
              <span className="ml-auto text-micro text-text-tertiary tabular-nums">{sf.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
