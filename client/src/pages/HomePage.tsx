import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { FolderOpen, Settings, Clock, CircleDot, FolderPlus } from 'lucide-react'
import FolderPicker from '../components/FolderPicker'

const RECENT_KEY = 'photo-review:recent-folders'
const MAX_RECENT = 10

function getRecentFolders(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    return []
  }
}

function addRecentFolder(path: string) {
  const recent = getRecentFolders().filter(p => p !== path)
  recent.unshift(path)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

export default function HomePage() {
  const navigate = useNavigate()
  const { loadPhotos } = useApp()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const recentFolders = getRecentFolders()

  const handleScan = useCallback(async (path: string) => {
    if (!path.trim()) return
    setLoading(path)
    setError('')
    try {
      await loadPhotos(path.trim())
      addRecentFolder(path.trim())
      navigate('/grid')
    } catch (e: any) {
      setError(e.message || '扫描失败')
    } finally {
      setLoading(null)
    }
  }, [loadPhotos, navigate])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const items = e.dataTransfer.items
    if (items && items.length > 0) {
      const entry = items[0].webkitGetAsEntry?.()
      if (entry?.isDirectory) {
        const file = e.dataTransfer.files[0]
        if (file && (file as any).path) {
          handleScan((file as any).path as string)
        }
        return
      }
    }
    const file = e.dataTransfer.files[0]
    if (file) {
      const path = (file as any).path || file.name
      handleScan(path)
    }
  }, [handleScan])

  const handlePickerSelect = useCallback((path: string) => {
    handleScan(path)
  }, [handleScan])

  return (
    <div
      className="h-screen flex flex-col bg-bg"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* ── Toolbar ── */}
      <header className="h-11 bg-bg-elevated border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <h1
            className="font-semibold text-text tracking-tight"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-2)' }}
          >
            Photo Review
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-text-tertiary text-micro">
            <span className="relative flex size-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <CircleDot className="relative size-1.5 text-success fill-success" />
            </span>
            已连接
          </span>
          <button className="w-7 h-7 rounded-md flex items-center justify-center text-text-tertiary hover:text-text hover:bg-fill-subtle transition-colors duration-fast">
            <Settings className="size-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="w-52 bg-bg-elevated/60 border-r border-border flex flex-col shrink-0">
          {/* Quick action */}
          <div className="px-3 pt-4 pb-2">
            <button
              onClick={() => setPickerOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-caption text-text-secondary hover:bg-fill-subtle hover:text-accent transition-colors duration-fast"
            >
              <FolderPlus className="size-3.5 text-accent" strokeWidth={1.5} />
              选择文件夹
            </button>
          </div>

          {/* Recent section */}
          <div className="px-3 pt-4 pb-3">
            <span className="text-micro font-semibold text-text-tertiary uppercase tracking-wider">
              最近使用
            </span>
          </div>
          <nav className="px-2 flex-1 overflow-y-auto pb-4">
            {recentFolders.length === 0 ? (
              <p className="px-3 text-micro text-text-tertiary">暂无记录</p>
            ) : (
              recentFolders.map((p) => {
                const name = p.split(/[/\\]/).filter(Boolean).pop() || p
                return (
                  <button
                    key={p}
                    onClick={() => handleScan(p)}
                    disabled={loading !== null}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-caption text-text-secondary hover:bg-fill-subtle transition-colors duration-fast disabled:opacity-40"
                    title={p}
                  >
                    <Clock className="size-3 text-text-tertiary shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{name}</span>
                  </button>
                )
              })
            )}
          </nav>
        </aside>

        {/* ── Main Content ── */}
        <main
          className={`flex-1 flex items-center justify-center transition-colors duration-normal ${dragOver ? 'bg-accent-subtle' : 'bg-bg'}`}
        >
          {error && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10">
              <p className="text-danger text-caption bg-danger-subtle px-4 py-2 rounded-md border border-danger/20 shadow-sm">{error}</p>
            </div>
          )}

          {recentFolders.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-24 h-24 rounded-2xl bg-fill-subtle flex items-center justify-center">
                <FolderOpen className="size-12 text-text-tertiary" strokeWidth={1.25} />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-text" style={{ fontSize: 'var(--text-title-1)' }}>尚未打开过文件夹</p>
                <p className="text-text-secondary" style={{ fontSize: 'var(--text-body)' }}>选择一个文件夹开始审阅照片</p>
              </div>
              <button
                onClick={() => setPickerOpen(true)}
                className="px-8 py-3 rounded-xl bg-accent text-white font-semibold text-body hover:bg-accent-hover transition-all duration-fast shadow-card active:scale-[0.97]"
              >
                选择文件夹
              </button>
            </div>
          ) : (
            /* Folder grid */
            <div className="w-full h-full overflow-y-auto p-8">
              <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                {/* Add new folder card */}
                <button
                  onClick={() => setPickerOpen(true)}
                  className="flex flex-col items-center gap-2.5 p-5 rounded-xl border-2 border-dashed border-text-tertiary/20 hover:border-accent/50 hover:bg-accent-subtle/50 transition-all duration-fast group"
                >
                  <div className="w-12 h-12 rounded-xl bg-fill-subtle group-hover:bg-accent-subtle flex items-center justify-center transition-colors duration-fast">
                    <FolderPlus className="size-5 text-text-tertiary group-hover:text-accent transition-colors duration-fast" strokeWidth={1.5} />
                  </div>
                  <span className="text-caption text-text-secondary group-hover:text-accent transition-colors duration-fast">添加文件夹</span>
                </button>

                {/* Recent folder cards */}
                {recentFolders.map((p) => {
                  const name = p.split(/[/\\]/).filter(Boolean).pop() || p
                  const isLoading = loading === p
                  return (
                    <button
                      key={p}
                      onClick={() => handleScan(p)}
                      disabled={loading !== null}
                      className="flex flex-col items-center gap-2.5 p-5 rounded-xl bg-bg-elevated shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-fast disabled:opacity-40 group"
                      title={p}
                    >
                      <div className="w-12 h-12 rounded-xl bg-accent-subtle flex items-center justify-center">
                        <FolderOpen className="size-5 text-accent" strokeWidth={1.5} />
                      </div>
                      <span className="text-caption text-text font-medium truncate max-w-full">
                        {isLoading ? '扫描中...' : name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      <FolderPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
      />
    </div>
  )
}
