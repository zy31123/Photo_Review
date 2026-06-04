import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api, type BrowseResult } from '../api'
import {
  Folder, HardDrive, ChevronRight, ArrowLeft, ScanSearch,
} from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const { loadPhotos } = useApp()
  const [browse, setBrowse] = useState<BrowseResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)

  const loadDir = useCallback(async (dirPath?: string) => {
    setLoading(true)
    setError('')
    try {
      const result = await api.browseFolders(dirPath)
      setBrowse(result)
    } catch (e: any) {
      setError(e.message || '无法加载文件夹')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDir() }, [loadDir])

  const handleScan = async (path: string) => {
    setScanning(true)
    setError('')
    try {
      await loadPhotos(path)
      navigate('/grid')
    } catch (e: any) {
      setError(e.message || '扫描失败')
      setScanning(false)
    }
  }

  const currentPath = browse?.current ?? ''
  const sep = currentPath.includes('/') ? '/' : '\\'
  const pathParts = currentPath ? currentPath.split(/[/\\]/).filter(Boolean) : []

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      {/* Titlebar */}
      <div className="h-[var(--nav-height)] bg-bg-elevated border-b border-border-subtle flex items-center px-4 shrink-0">
        <h1
          className="font-semibold text-text tracking-tight"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-title-2)' }}
        >
          Photo Review
        </h1>

        {/* Breadcrumb */}
        {currentPath && (
          <div className="ml-6 flex items-center gap-1 text-caption">
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
        )}

        {/* Scan button */}
        {currentPath && (
          <button
            onClick={() => handleScan(currentPath)}
            disabled={scanning}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-caption font-medium bg-accent text-white hover:bg-accent-hover transition-colors duration-fast disabled:opacity-50"
          >
            <ScanSearch className="size-3.5" />
            {scanning ? '扫描中...' : '审阅此文件夹'}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-md bg-danger-subtle border border-danger/20 text-danger text-caption text-center">
          {error}
        </div>
      )}

      {/* Main content: Sidebar + Grid */}
      <div className="flex-1 min-h-0 flex">
        {/* Sidebar — Drive list */}
        <div className="w-48 shrink-0 border-r border-border-subtle bg-bg-elevated overflow-y-auto py-3 px-2">
          <div className="px-3 py-1.5 text-micro font-semibold text-text-tertiary uppercase tracking-wider">
            位置
          </div>
          {!loading && browse && currentPath === '' && browse.children.map(child => (
            <button
              key={child.path}
              onClick={() => loadDir(child.path)}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-sm text-caption text-text-secondary hover:bg-fill-subtle transition-colors duration-fast"
            >
              <HardDrive className="size-4 text-text-tertiary shrink-0" />
              <span className="truncate">{child.name}</span>
            </button>
          ))}
          {!loading && browse && currentPath !== '' && (
            <>
              <button
                onClick={() => loadDir('')}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-sm text-caption text-accent hover:bg-accent-subtle transition-colors duration-fast"
              >
                <HardDrive className="size-4 shrink-0" />
                <span>此电脑</span>
              </button>
              {browse.parent !== null && (
                <button
                  onClick={() => loadDir(browse.parent!)}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-sm text-caption text-text-secondary hover:bg-fill-subtle transition-colors duration-fast"
                >
                  <ArrowLeft className="size-4 text-text-tertiary shrink-0" />
                  <span>上级目录</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Content area — Folder grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-text-tertiary text-caption">加载中...</span>
              </div>
            </div>
          ) : browse && browse.children.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Folder className="size-12 text-text-tertiary/40" strokeWidth={1} />
              <p className="text-text-secondary text-caption">此文件夹没有子目录</p>
              <button
                onClick={() => handleScan(currentPath)}
                disabled={scanning}
                className="mt-2 px-4 py-2 rounded-md bg-accent text-white text-caption font-medium hover:bg-accent-hover transition-colors duration-fast disabled:opacity-50"
              >
                {scanning ? '扫描中...' : '直接审阅此文件夹'}
              </button>
            </div>
          ) : browse ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
              {browse.children.map(child => (
                <button
                  key={child.path}
                  onDoubleClick={() => loadDir(child.path)}
                  onClick={() => {}}
                  className="flex flex-col items-center gap-2 p-3 rounded-md hover:bg-fill-subtle transition-colors duration-fast group"
                >
                  <Folder className="size-14 text-accent/50 group-hover:text-accent/70 transition-colors duration-fast" strokeWidth={1.2} />
                  <span className="text-caption text-text-secondary text-center break-all line-clamp-2 leading-tight">
                    {child.name}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
