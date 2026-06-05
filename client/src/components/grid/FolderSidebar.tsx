import { FolderOpen, Folder } from 'lucide-react'
import { useGrid } from '../../context/GridContext'

export default function FolderSidebar() {
  const { subfolders, subfolderFilter, setSubfolderFilter, filteredPhotos, photos } = useGrid()

  return (
    <div className="w-56 shrink-0 border-r border-border-subtle bg-glass-thin backdrop-blur-xl overflow-y-auto py-3 px-3">
      <button
        onClick={() => setSubfolderFilter(null)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-caption transition-colors duration-fast ${
          !subfolderFilter
            ? 'bg-accent-subtle text-accent font-medium'
            : 'text-text-secondary hover:bg-fill-subtle'
        }`}
      >
        <FolderOpen className="size-4 shrink-0" strokeWidth={1.5} />
        <span className="truncate">全部照片</span>
        <span className="ml-auto text-micro text-text-tertiary tabular-nums">{photos.length}</span>
      </button>

      {subfolders.length > 0 && (
        <div className="mt-3 space-y-0.5">
          <div className="px-3 py-2 text-micro font-semibold text-text-tertiary uppercase tracking-wider">
            子文件夹
          </div>
          {subfolders.map(sf => (
            <button
              key={sf.path}
              onClick={() => setSubfolderFilter(subfolderFilter === sf.path ? null : sf.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-caption transition-colors duration-fast ${
                subfolderFilter === sf.path
                  ? 'bg-accent-subtle text-accent font-medium'
                  : 'text-text-secondary hover:bg-fill-subtle'
              }`}
            >
              <Folder className="size-4 shrink-0" strokeWidth={1.5} />
              <span className="truncate">{sf.name}</span>
              <span className="ml-auto text-micro text-text-tertiary tabular-nums">{sf.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
