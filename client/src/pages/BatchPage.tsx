import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getActiveFolder, type PhotoGroup } from '../api'

export default function BatchPage() {
  const navigate = useNavigate()
  const [orphaned, setOrphaned] = useState<{ jpg: PhotoGroup[]; raw: PhotoGroup[] }>({ jpg: [], raw: [] })

  useEffect(() => {
    if (!getActiveFolder()) navigate('/')
  }, [navigate])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<'jpg' | 'raw' | null>(null)

  useEffect(() => {
    api.getOrphaned()
      .then(setOrphaned)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (type: 'jpg' | 'raw') => {
    setConfirmDelete(null)
    setProcessing(true)
    try {
      const result = await api.deleteOrphaned(type)
      if (result.success) {
        setOrphaned(prev => ({ ...prev, [type]: [] }))
      }
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-text-secondary">
        扫描中...
      </div>
    )
  }

  const hasOrphans = orphaned.jpg.length > 0 || orphaned.raw.length > 0

  return (
    <div className="h-screen flex flex-col bg-bg">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <button onClick={() => navigate('/review')} className="text-text-muted hover:text-text text-sm">
          ← 返回
        </button>
        <h1 className="text-lg font-display font-bold">批量处理</h1>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {!hasOrphans && (
          <div className="text-center text-text-secondary mt-20">
            <p className="text-lg mb-2">没有发现孤立文件</p>
            <p className="text-text-muted text-sm">所有 JPG 和 RAW 文件都已正确配对</p>
          </div>
        )}

        {orphaned.jpg.length > 0 && (
          <section className="bg-bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-accent font-semibold text-base flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  无 RAW 配对的 JPG
                </h2>
                <p className="text-text-muted text-sm mt-1">{orphaned.jpg.length} 张文件</p>
              </div>
              <button
                onClick={() => setConfirmDelete('jpg')}
                disabled={processing}
                className="px-4 py-2 rounded-lg bg-danger-dim text-text text-sm font-semibold hover:bg-danger transition-colors disabled:opacity-50"
              >
                删除全部 JPG
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {orphaned.jpg.map(p => (
                <span key={p.id} className="px-2 py-1 bg-bg rounded text-text-secondary text-xs">
                  {p.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {orphaned.raw.length > 0 && (
          <section className="bg-bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-accent font-semibold text-base flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  无 JPG 配对的 RAW
                </h2>
                <p className="text-text-muted text-sm mt-1">{orphaned.raw.length} 张文件</p>
              </div>
              <button
                onClick={() => setConfirmDelete('raw')}
                disabled={processing}
                className="px-4 py-2 rounded-lg bg-danger-dim text-text text-sm font-semibold hover:bg-danger transition-colors disabled:opacity-50"
              >
                删除全部 RAW
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {orphaned.raw.map(p => (
                <span key={p.id} className="px-2 py-1 bg-bg rounded text-text-secondary text-xs">
                  {p.name}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-[360px] shadow-2xl">
            <h3 className="text-text font-semibold text-base mb-2">确认删除</h3>
            <p className="text-text-secondary text-sm mb-5">
              确定要删除全部 {confirmDelete.toUpperCase()} 孤立文件吗？文件将移至回收站。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-hover text-sm transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-semibold hover:bg-danger-dim transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
