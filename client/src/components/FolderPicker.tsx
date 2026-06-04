import { useState, useEffect, useCallback } from 'react'
import { api, type BrowseResult } from '../api'
import { X, ChevronRight, Folder, HardDrive, ArrowLeft } from 'lucide-react'

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
    if (open) loadDir('')
  }, [open, loadDir])

  if (!open) return null

  const currentPath = browse?.current ?? ''
  const sep = currentPath.includes('/') ? '/' : '\\'
  const pathParts = currentPath ? currentPath.split(/[/\\]/).filter(Boolean) : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[40rem] max-h-[80vh] bg-bg-elevated border border-border rounded-lg flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <h2 className="text-title-2 font-semibold text-text">选择文件夹</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-sm flex items-center justify-center text-text-tertiary hover:text-text hover:bg-fill-subtle transition-colors duration-fast"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="px-4 py-2.5 border-b border-border-subtle">
          <div className="flex items-center gap-1 text-caption flex-wrap">
            <button
              onClick={() => loadDir('')}
              className="text-accent hover:underline flex items-center gap-1"
            >
              <HardDrive className="size-3" />
              此电脑
            </button>
            {pathParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="size-3 text-text-tertiary" />
                <button
                  onClick={() => {
                    const path = pathParts.slice(0, i + 1).join(sep)
                    loadDir(path)
                  }}
                  className={`${i === pathParts.length - 1 ? 'text-text font-medium' : 'text-accent hover:underline'}`}
                >
                  {part}
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Directory list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 min-h-[18.75rem]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-text-tertiary text-caption">
              加载中...
            </div>
          ) : (
            <>
              {error && (
                <div className="text-center text-danger text-caption py-8">{error}</div>
              )}
              {!error && browse && (
                <>
                  {browse.parent !== null && (
                    <button
                      onClick={() => loadDir(browse.parent!)}
                      className="w-full text-left px-3 py-2.5 rounded-md text-caption text-text-secondary hover:bg-fill-subtle transition-colors duration-fast flex items-center gap-2.5"
                    >
                      <ArrowLeft className="size-4 text-text-tertiary" />
                      <span>..</span>
                      <span className="text-text-tertiary text-micro ml-auto">
                        {browse.parent === '' ? '所有驱动器' : '上级目录'}
                      </span>
                    </button>
                  )}
                  {browse.children.length === 0 && (
                    <div className="text-center text-text-tertiary text-caption py-8">
                      此文件夹没有子目录
                    </div>
                  )}
                  {browse.children.map(child => (
                    <button
                      key={child.path}
                      onClick={() => loadDir(child.path)}
                      className="w-full text-left px-3 py-2.5 rounded-md text-caption text-text-secondary hover:bg-fill-subtle transition-colors duration-fast flex items-center gap-2.5"
                    >
                      <Folder className="size-4 text-accent/60" />
                      <span className="truncate">{child.name}</span>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-caption text-text-secondary hover:text-text hover:bg-fill-subtle transition-colors duration-fast"
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
            className="px-5 py-2 rounded-md bg-accent text-white font-semibold text-caption hover:bg-accent-hover transition-colors duration-fast disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {browse?.current === '' ? '请选择一个驱动器' : '选择此文件夹'}
          </button>
        </div>
      </div>
    </div>
  )
}
