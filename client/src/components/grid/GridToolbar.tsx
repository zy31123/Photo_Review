import { PanelLeftClose, PanelLeftOpen, LayoutGrid } from 'lucide-react'
import { useGrid } from '../../context/GridContext'
import ToolbarDivider from '../ui/ToolbarDivider'

const columnOptions = [2, 3, 4, 5]

export default function GridToolbar() {
  const { columns, setColumns, filteredPhotos, sidebarOpen, toggleSidebar, subfolderFilter, subfolders } = useGrid()

  const activeSubfolder = subfolders.find(sf => sf.path === subfolderFilter)

  return (
    <div className="h-13 bg-bg-deep border-b border-border/30 flex items-center px-6 shrink-0">
      <button
        onClick={toggleSidebar}
        className="flex items-center gap-2 text-text-muted hover:text-text-secondary transition-colors mr-4"
        title={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
      >
        {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
      </button>

      <div className="flex items-center gap-2.5 text-text-secondary text-sm">
        <LayoutGrid size={16} />
        <span>{filteredPhotos.length.toLocaleString()} 张照片</span>
        {activeSubfolder && (
          <span className="text-accent/80 ml-2 text-sm">/ {activeSubfolder.name}</span>
        )}
      </div>

      <ToolbarDivider />

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
