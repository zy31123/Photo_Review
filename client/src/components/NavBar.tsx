import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, Eye, Shuffle, Folder } from 'lucide-react'
import { useApp } from '../context/AppContext'

const navItems = [
  { path: '/grid', label: '网格总览', icon: LayoutGrid },
  { path: '/review', label: '顺序审阅', icon: Eye },
  { path: '/random', label: '随机浏览', icon: Shuffle },
]

export default function NavBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { activeFolder, isLoaded } = useApp()

  return (
    <div className="h-13 bg-bg-deep border-b border-border/30 flex items-center px-4 shrink-0">
      <button
        onClick={() => navigate('/')}
        className="text-text-heading font-display font-semibold text-base tracking-wide hover:text-accent transition-colors"
      >
        Photo Review
      </button>

      <div className="flex items-center gap-1.5 ml-8">
        {navItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              disabled={!isLoaded}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-accent/15 text-accent'
                  : isLoaded
                    ? 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
                    : 'text-text-muted/40 cursor-not-allowed'
              }`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="ml-auto flex items-center gap-3">
        {activeFolder && (
          <div className="flex items-center gap-1.5 text-text-muted text-sm">
            <Folder size={14} />
            <span className="max-w-[200px] truncate">{activeFolder.split(/[\\/]/).pop()}</span>
          </div>
        )}
      </div>
    </div>
  )
}
