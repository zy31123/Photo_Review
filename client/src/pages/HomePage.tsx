import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import FolderPicker from '../components/FolderPicker'

export default function HomePage() {
  const navigate = useNavigate()
  const { loadPhotos } = useApp()
  const [folderPath, setFolderPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const handleScan = async () => {
    if (!folderPath.trim()) return
    setLoading(true)
    setError('')
    try {
      await loadPhotos(folderPath.trim())
      navigate('/grid')
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

        <h1 className="text-6xl font-display font-bold text-text-heading tracking-tight mb-5">
          Photo Review
        </h1>
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-accent to-transparent mb-4" />
        <p className="text-text-secondary text-lg mb-14 tracking-wide">
          选择你的图库文件夹开始审阅
        </p>

        <div className="w-full max-w-xl space-y-4">
          <div className="flex gap-2">
            <div
              className="flex-1 bg-bg-raised border border-border rounded-lg px-5 py-4 text-text-secondary font-mono text-base truncate cursor-pointer hover:border-accent/40 transition-all duration-200"
              onClick={() => setPickerOpen(true)}
            >
              {folderPath || '点击选择文件夹...'}
            </div>
            <button
              onClick={() => setPickerOpen(true)}
              className="px-5 py-4 rounded-lg border border-border text-text-secondary hover:bg-bg-hover hover:text-text hover:border-border-light hover:shadow-inner transition-all duration-200 text-base"
            >
              浏览
            </button>
          </div>

          {error && (
            <p className="text-danger text-sm bg-danger/10 px-4 py-2 rounded-lg border border-danger/20 border-l-2 border-l-danger">{error}</p>
          )}

          <button
            onClick={handleScan}
            disabled={loading || !folderPath.trim()}
            className="w-full py-4 rounded-lg bg-accent text-bg font-semibold text-lg hover:bg-accent-dim hover:shadow-lg hover:shadow-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
          >
            {loading ? '扫描中...' : '开始审阅'}
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
