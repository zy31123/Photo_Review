import { LayoutGrid } from 'lucide-react'
import { useGrid } from '../../context/GridContext'

const columnOptions = [2, 3, 4, 5, 6, 8]

export default function GridToolbar() {
  const { columns, setColumns, filteredPhotos, subfolderFilter, subfolders } = useGrid()

  const activeSubfolder = subfolders.find(sf => sf.path === subfolderFilter)

  return (
    <div className="h-13 bg-bg-deep border-b border-border/30 flex items-center px-6 shrink-0">
      <div className="flex items-center gap-2.5 text-text-secondary text-sm">
        <LayoutGrid className="size-4" />
        <span>{filteredPhotos.length.toLocaleString()} 张照片</span>
        {activeSubfolder && (
          <span className="text-accent/80 ml-2 text-sm">/ {activeSubfolder.name}</span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <span className="text-text-muted text-sm mr-3">每行</span>
        {columnOptions.map(n => (
          <button
            key={n}
            onClick={() => setColumns(n)}
            className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
              columns === n
                ? 'bg-accent/15 text-accent'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
