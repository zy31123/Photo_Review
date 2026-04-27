import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setActiveFolder } from '../api'
import FolderPicker from '../components/FolderPicker'

export default function HomePage() {
  const navigate = useNavigate()
  const [folderPath, setFolderPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const handleScan = async () => {
    if (!folderPath.trim()) return
    setLoading(true)
    setError('')
    try {
      await api.scanFolder(folderPath.trim())
      setActiveFolder(folderPath.trim())
      navigate('/review')
    } catch (e: any) {
      setError(e.message || '扫描失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center px-6 bg-bg relative">
      {/* Subtle gradient orb background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Decorative dots */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="w-1.5 h-1.5 rounded-full bg-accent/60" />
          <span className="w-1.5 h-1.5 rounded-full bg-accent/30" />
        </div>

        <h1 className="text-5xl font-display font-bold text-text-heading tracking-tight mb-1">
          Photo Review
        </h1>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-accent to-transparent mb-3" />
        <p className="text-text-secondary text-lg mb-10 tracking-wide">
          选择你的图库文件夹开始审阅
        </p>

        <div className="w-full max-w-lg space-y-4">
          <div className="flex gap-2">
            <div
              className="flex-1 bg-bg-raised border border-border rounded-lg px-4 py-3 text-text-secondary font-mono text-sm truncate cursor-pointer hover:border-accent/40 transition-all duration-200"
              onClick={() => setPickerOpen(true)}
            >
              {folderPath || '点击选择文件夹...'}
            </div>
            <button
              onClick={() => setPickerOpen(true)}
              className="px-4 py-3 rounded-lg border border-border text-text-secondary hover:bg-bg-hover hover:text-text hover:border-border-light transition-all duration-200 text-sm"
            >
              浏览
            </button>
          </div>

          {error && (
            <p className="text-danger text-sm bg-danger/10 px-4 py-2 rounded-lg border border-danger/20">{error}</p>
          )}

          <button
            onClick={handleScan}
            disabled={loading || !folderPath.trim()}
            className="w-full py-3 rounded-lg bg-accent text-bg font-semibold text-base hover:bg-accent-dim disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
          >
            {loading ? '扫描中...' : '开始审阅'}
          </button>
        </div>

        <div className="mt-14 flex gap-8">
          <button
            onClick={() => navigate('/batch')}
            className="text-text-muted hover:text-text-secondary transition-colors text-sm group"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              批量处理
            </span>
          </button>
          <button
            onClick={() => navigate('/random')}
            className="text-text-muted hover:text-text-secondary transition-colors text-sm group"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              随机浏览
            </span>
          </button>
        </div>
      </div>

      <FolderPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(path) => setFolderPath(path)}
      />
    </div>
  )
}
