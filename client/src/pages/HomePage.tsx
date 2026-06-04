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
        <h1
          className="font-bold text-text tracking-[-0.03em] leading-[1.1] mb-3"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-display)' }}
        >
          Photo Review
        </h1>
        <div className="w-12 h-px bg-border mb-3" />
        <p className="text-text-secondary text-caption mb-10">
          选择你的图库文件夹开始审阅
        </p>

        <div className="w-full max-w-xl space-y-3">
          <div
            className={`flex items-center bg-bg-elevated border rounded-md overflow-hidden cursor-pointer transition-colors duration-fast ${folderPath ? 'border-accent/30' : 'border-border'}`}
            onClick={() => setPickerOpen(true)}
          >
            <div className="flex-1 px-4 py-3 text-body truncate flex items-center gap-2.5">
              <FolderOpen className="size-4 text-accent/60 shrink-0" />
              {folderPath ? (
                <span className="text-text font-medium">{folderPath}</span>
              ) : (
                <span className="text-text-secondary">点击选择文件夹...</span>
              )}
            </div>
            <button className="px-4 py-3 text-accent font-medium text-caption border-l border-border-subtle hover:bg-accent-subtle transition-colors duration-fast">
              浏览
            </button>
          </div>

          {error && (
            <p className="text-danger text-micro bg-danger-subtle px-3 py-2 rounded-md border border-danger/20">{error}</p>
          )}

          <button
            onClick={handleScan}
            disabled={loading || !folderPath.trim()}
            className="w-full py-2.5 rounded-md bg-accent text-white font-semibold text-caption hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-fast"
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
