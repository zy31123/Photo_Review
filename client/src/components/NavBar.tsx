import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Eye, Shuffle, Layers, Folder } from 'lucide-react'
import { useApp } from '../context/AppContext'

const navItems = [
  { path: '/grid', label: '网格总览', icon: LayoutGrid },
  { path: '/review', label: '顺序审阅', icon: Eye },
  { path: '/random', label: '随机浏览', icon: Shuffle },
  { path: '/similar', label: '相似聚类', icon: Layers },
]

export default function NavBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { activeFolder, isLoaded } = useApp()

  return (
    <div className="h-12 bg-surface-primary backdrop-blur-xl border-b border-border-light flex items-center px-4 shrink-0">
      <button
        onClick={() => navigate('/')}
        className="text-text-heading font-semibold text-base tracking-tight hover:text-accent transition-colors"
      >
        Photo Review
      </button>

      <div className="flex items-center bg-fill-muted rounded-lg p-1 ml-6">
        {navItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              disabled={!isLoaded}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-white text-text-heading shadow-sm'
                  : isLoaded
                    ? 'text-text-muted hover:text-text-secondary'
                    : 'text-text-muted/40 cursor-not-allowed'
              }`}
            >
              <Icon className="size-4" strokeWidth={1.5} />
              {item.label}
            </button>
          )
        })}
      </div>

      {activeFolder && (
        <span className="ml-auto text-text-muted text-sm flex items-center gap-1.5">
          <Folder className="size-3.5" strokeWidth={1.5} />
          <span className="truncate max-w-[12rem]">{activeFolder}</span>
        </span>
      )}
    </div>
  )
}
