import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Eye, Shuffle, Layers, Folder, PanelLeft, LayoutList, Minus, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useGrid } from '../context/GridContext'
import { useReview } from '../context/ReviewContext'

const navItems = [
  { path: '/grid', label: '网格总览', icon: LayoutGrid },
  { path: '/review', label: '顺序审阅', icon: Eye },
  { path: '/random', label: '随机浏览', icon: Shuffle },
  { path: '/similar', label: '相似聚类', icon: Layers },
]

function GridControls() {
  const { columns, setColumns, filteredPhotos } = useGrid()
  return (
    <div className="flex items-center gap-3">
      <span className="text-text-muted text-sm">{filteredPhotos.length.toLocaleString()} 张</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setColumns(Math.max(2, columns - 1))}
          disabled={columns <= 2}
          className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center text-text-secondary hover:bg-black/[0.06] disabled:opacity-30 transition-colors"
        >
          <Minus className="size-3" />
        </button>
        <span className="text-text-secondary text-xs tabular-nums w-6 text-center font-medium">{columns}</span>
        <button
          onClick={() => setColumns(Math.min(8, columns + 1))}
          disabled={columns >= 8}