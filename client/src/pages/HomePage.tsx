import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { FolderOpen } from 'lucide-react'
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
      <div className="relative z-10 flex flex-col items-center">
        <h1 className="text-[3.5rem] font-bold text-text-heading tracking-[-0.04em] leading-[1.1] mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          Photo Review
        </h1>
        <div className="w-16 h-px bg-border-light mb-4" />
        <p className="text-text-secondary text-lg mb-12">
          选择你的图库文件夹开始审阅
        </p>

        <div className="w-full max-w-xl space-y-4">
          <div
            className={`flex items-center bg-surface-primary backdrop-blur-xl border rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${folderPath ? 'border-accent/30' : 'border-border-light'}`}
            onClick={() => setPickerOpen(true)}
          >
            <div className="flex-1 px-5 py-4 text-base truncate flex items-center gap-3">
              <FolderOpen className="size-5 text-accent/60 shrink-0" />
              {folderPath ? (
                <span className="text-text font-medium">{folderPath}</span>
              ) : (
                <span className="text-text-secondary">点击选择文件夹...</span>
              )}
            </div>
            <button className="px-5 py-4 text-accent font-medium text-base border-l border-border-faint hover:bg-accent/5 transition-colors">
              浏览
            </button>
          </div>

          {error && (
            <p className="text-danger text-sm bg-danger/5 px-4 py-2.5 rounded-xl border border-danger/20">{error}</p>
          )}

          <button
            onClick={handleScan}
            disabled={loading || !folderPath.trim()}
            className="w-full py-4 rounded-xl bg-accent text-white font-semibold text-lg hover:bg-accent-dim disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
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
