import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
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
      navigate('/review')
    } catch (e: any) {
      setError(e.message || '扫描失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-accent" />
        <span className="w-2 h-2 rounded-full bg-accent opacity-60" />
        <span className="w-2 h-2 rounded-full bg-accent opacity-30" />
      </div>

      <h1 className="text-5xl font-display font-bold text-text tracking-tight mb-1">
        Photo Review
      </h1>
      <div className="w-24 h-px bg-accent mb-4" />
      <p className="text-text-secondary text-lg mb-10">
        选择你的图库文件夹开始审阅
      </p>

      <div className="w-full max-w-lg space-y-4">
        <div className="flex gap-2">
          <div
            className="flex-1 bg-bg-card border border-border rounded-lg px-4 py-3 text-text-secondary font-mono text-sm truncate cursor-pointer hover:border-accent/50 transition-colors"
            onClick={() => setPickerOpen(true)}
          >
            {folderPath || '点击选择文件夹...'}
          </div>
          <button
            onClick={() => setPickerOpen(true)}
            className="px-4 py-3 rounded-lg border border-border text-text-secondary hover:bg-bg-hover hover:text-text transition-colors text-sm"
          >
            浏览
          </button>
        </div>

        {error && (
          <p className="text-danger text-sm">{error}</p>
        )}

        <button
          onClick={handleScan}
          disabled={loading || !folderPath.trim()}
          className="w-full py-3 rounded-lg bg-accent text-bg font-semibold text-base hover:bg-accent-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '扫描中...' : '开始审阅'}
        </button>
      </div>

      <div className="mt-12 flex gap-8">
        <button
          onClick={() => navigate('/batch')}
          className="text-text-muted hover:text-text-secondary transition-colors text-sm"
        >
          批量处理
        </button>
        <button
          onClick={() => navigate('/random')}
          className="text-text-muted hover:text-text-secondary transition-colors text-sm"
        >
          随机浏览
        </button>
      </div>

      <FolderPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(path) => setFolderPath(path)}
      />
    </div>
  )
}
