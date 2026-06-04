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
    <div className="h-[var(--nav-height)] bg-glass backdrop-blur-xl border-b border-border-subtle flex items-center px-4 shrink-0">
      <button
        onClick={() => navigate('/')}
        className="text-text font-semibold text-title-2 tracking-tight hover:text-accent transition-colors duration-fast"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Photo Review
      </button>

      <div className="flex items-center bg-fill-subtle rounded-sm p-0.5 ml-5">
        {navItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              disabled={!isLoaded}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-sm text-caption font-medium transition-colors duration-fast ${
                active
                  ? 'bg-bg-elevated text-text shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : isLoaded
                    ? 'text-text-tertiary hover:text-text-secondary'
                    : 'text-text-tertiary/40 cursor-not-allowed'
              }`}
            >
              <Icon className="size-3.5" strokeWidth={1.5} />
              {item.label}
            </button>
          )
        })}
      </div>

      {activeFolder && (
        <span className="ml-auto text-text-tertiary text-caption flex items-center gap-1.5">
          <Folder className="size-3" strokeWidth={1.5} />
          <span className="truncate max-w-[12rem]">{activeFolder}</span>
        </span>
      )}
    </div>
  )
}
