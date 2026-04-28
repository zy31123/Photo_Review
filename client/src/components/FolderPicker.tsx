import { useState, useEffect, useCallback } from 'react'
import { api, type BrowseResult } from '../api'

interface FolderPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (path: string) => void
}

export default function FolderPicker({ open, onClose, onSelect }: FolderPickerProps) {
  const [browse, setBrowse] = useState<BrowseResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadDir = useCallback(async (dirPath?: string) => {
    setLoading(true)
    setError('')
    try {
      const result = await api.browseFolders(dirPath)
      setBrowse(result)
    } catch (e: any) {
      setBrowse(null)
      setError(e.message || '无法加载文件夹')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadDir()
  }, [open, loadDir])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[680px] max-h-[80vh] bg-bg-card border border-border rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">选择文件夹</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Current path */}
        <div className="px-5 py-3 border-b border-border">
          <div className="text-sm text-text-muted mb-1">当前路径</div>
          <div className="text-base text-text-secondary font-mono truncate">
            {browse?.current === '' ? '此电脑 / 所有驱动器' : (browse?.current || '...')}
          </div>
        </div>

        {/* Directory list */}
        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-text-muted text-base">
              加载中...
            </div>
          ) : (
            <>
              {error && (
                <div className="text-center text-danger text-sm py-8">{error}</div>
              )}
              {!error && browse && (
                <>
              {browse.parent !== null && (
                <button
                  onClick={() => loadDir(browse.parent!)}
                  className="w-full text-left px-4 py-3.5 rounded-lg text-base text-text-secondary hover:bg-bg-hover transition-colors flex items-center gap-2"
                >
                  <span className="text-accent">↑</span>
                  <span>..</span>
                  <span className="text-text-muted text-sm ml-auto">
                    {browse.parent === '' ? '所有驱动器' : '上级目录'}
                  </span>
                </button>
              )}
              {browse.children.length === 0 && (
                <div className="text-center text-text-muted text-base py-8">
                  此文件夹没有子目录
                </div>
              )}
              {browse.children.map(child => (
                <button
                  key={child.path}
                  onClick={() => loadDir(child.path)}
                  className="w-full text-left px-4 py-3.5 rounded-lg text-base text-text-secondary hover:bg-bg-hover transition-colors flex items-center gap-2"
                >
                  <span className="text-accent text-sm">📁</span>
                  <span className="truncate">{child.name}</span>
                </button>
              ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-lg border border-border text-text-secondary hover:bg-bg-hover text-base transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              if (browse?.current != null && browse.current !== '') {
                onSelect(browse.current)
                onClose()
              }
            }}
            disabled={!browse?.current}
            className="px-5 py-3 rounded-lg bg-accent text-bg font-semibold text-base hover:bg-accent-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {browse?.current === '' ? '请选择一个驱动器' : '选择此文件夹'}
          </button>
        </div>
      </div>
    </div>
  )
}
