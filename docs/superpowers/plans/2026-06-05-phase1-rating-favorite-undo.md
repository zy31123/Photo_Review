# Phase 1: 数据基础 + 评分收藏 + 撤销系统 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Photo Review 添加星级评分、收藏标记和操作撤销系统，建立"审阅→管理"的数据基础。

**Architecture:** 后端在 SQLite 新增 `photo_meta` 等表，通过 `photos` 路由暴露评分/收藏 API。前端新增 `RatingStars`/`Toast` 组件和 `useUndoHistory` hook，在审阅页、网格页、随机页和 Lightbox 中集成评分/收藏交互。

**Tech Stack:** Express 5 + better-sqlite3 (后端), React 19 + Tailwind 4 (前端), lucide-react (图标)

---

## File Structure

### 新建文件
| 文件 | 职责 |
|------|------|
| `server/src/services/photoMeta.ts` | 评分/收藏的 DB 读写 |
| `client/src/components/ui/RatingStars.tsx` | 可复用星级评分组件 |
| `client/src/components/ui/Toast.tsx` | 轻量 toast 通知组件 |
| `client/src/hooks/useUndoHistory.ts` | 操作撤销历史栈 |

### 修改文件
| 文件 | 改动 |
|------|------|
| `server/src/db/migrations.ts` | 新增 migration v3（6 张表） |
| `server/src/routes/photos.ts` | 新增 rating/favorite 端点 + 列表接口返回 rating/favorite |
| `server/src/routes/index.ts` | 无需改动（复用 photos 路由） |
| `client/src/api/index.ts` | 新增 rating/favorite API 调用 + PhotoGroup 类型扩展 |
| `client/src/context/AppContext.tsx` | 新增 updatePhotoMeta / batch meta 加载 |
| `client/src/context/ReviewContext.tsx` | 操作时入栈 undo + 使用 updatePhotoMeta |
| `client/src/components/review/ReviewControls.tsx` | 增加评分/收藏按钮 |
| `client/src/components/review/PhotoDetailsView.tsx` | 增加评分/收藏显示区域 |
| `client/src/components/review/ImageViewport.tsx` | 无需改动（controls 在 ReviewControls 里） |
| `client/src/components/random/RandomControls.tsx` | 增加评分/收藏按钮 |
| `client/src/pages/RandomPage.tsx` | 集成 undo + rating/favorite 快捷键 |
| `client/src/components/grid/Lightbox.tsx` | 增加 rating/favorite 叠加层 |
| `client/src/pages/GridPage.tsx` | 缩略图角标显示星级/收藏 + undo 快捷键 |
| `client/src/hooks/useKeyboardShortcuts.ts` | 新增 onRating/onFavorite/onUndo 回调 |
| `client/src/pages/ReviewPage.tsx` | 新增 undo 快捷键绑定 |

---

## Task 1: 数据库 Migration

**Files:**
- Modify: `server/src/db/migrations.ts`

- [ ] **Step 1: 添加 migration version 3**

在 `migrations` 数组末尾添加：

```typescript
{
  version: 3,
  up: `
    CREATE TABLE IF NOT EXISTS photo_meta (
      photo_path TEXT PRIMARY KEY,
      rating INTEGER DEFAULT 0,
      favorite INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS photo_tags (
      photo_path TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (photo_path, tag_id),
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('manual','smart')),
      smart_rules TEXT,
      cover_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS collection_photos (
      collection_id INTEGER NOT NULL,
      photo_path TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      PRIMARY KEY (collection_id, photo_path),
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS photo_exif_index (
      photo_path TEXT PRIMARY KEY,
      camera TEXT,
      lens TEXT,
      focal REAL,
      aperture REAL,
      shutter REAL,
      iso INTEGER,
      date_taken TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_exif_camera ON photo_exif_index(camera);
    CREATE INDEX IF NOT EXISTS idx_exif_lens ON photo_exif_index(lens);
    CREATE INDEX IF NOT EXISTS idx_exif_date ON photo_exif_index(date_taken);
  `,
},
```

- [ ] **Step 2: 验证 migration 生效**

Run: `npm run dev:server`
Expected: 服务启动正常，控制台无 SQL 错误。关闭后检查 `server/data/photo-review.db` 中存在 `photo_meta`、`tags` 等表。

- [ ] **Step 3: 提交**

```bash
git add server/src/db/migrations.ts
git commit -m "feat: add migration v3 — photo_meta, tags, collections, exif_index tables"
```

---

## Task 2: 后端 photoMeta Service

**Files:**
- Create: `server/src/services/photoMeta.ts`

- [ ] **Step 1: 创建 photoMeta 服务**

```typescript
import { getDb } from '../db/index.js'

export interface PhotoMeta {
  rating: number
  favorite: boolean
}

/** 批量获取照片 meta，返回 Map<filePath, PhotoMeta> */
export function getPhotoMetaBatch(filePaths: string[]): Map<string, PhotoMeta> {
  const result = new Map<string, PhotoMeta>()
  if (filePaths.length === 0) return result

  const db = getDb()
  const placeholders = filePaths.map(() => '?').join(',')
  const rows = db.prepare(
    `SELECT photo_path, rating, favorite FROM photo_meta WHERE photo_path IN (${placeholders})`
  ).all(...filePaths) as { photo_path: string; rating: number; favorite: number }[]

  for (const row of rows) {
    result.set(row.photo_path, { rating: row.rating, favorite: row.favorite === 1 })
  }
  return result
}

/** 设置照片评分 (0-5) */
export function setRating(filePath: string, rating: number): void {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)))
  const db = getDb()
  db.prepare(`
    INSERT INTO photo_meta (photo_path, rating, favorite, updated_at)
    VALUES (?, ?, 0, CURRENT_TIMESTAMP)
    ON CONFLICT(photo_path) DO UPDATE SET rating = ?, updated_at = CURRENT_TIMESTAMP
  `).run(filePath, clamped, clamped)
}

/** 切换收藏状态，返回新状态 */
export function toggleFavorite(filePath: string): boolean {
  const db = getDb()
  const row = db.prepare('SELECT favorite FROM photo_meta WHERE photo_path = ?').get(filePath) as { favorite: number } | undefined
  const newValue = row ? (row.favorite === 1 ? 0 : 1) : 1
  db.prepare(`
    INSERT INTO photo_meta (photo_path, rating, favorite, updated_at)
    VALUES (?, 0, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(photo_path) DO UPDATE SET favorite = ?, updated_at = CURRENT_TIMESTAMP
  `).run(filePath, newValue, newValue)
  return newValue === 1
}

/** 设置收藏状态（用于撤销时恢复确定值） */
export function setFavorite(filePath: string, value: boolean): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO photo_meta (photo_path, rating, favorite, updated_at)
    VALUES (?, 0, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(photo_path) DO UPDATE SET favorite = ?, updated_at = CURRENT_TIMESTAMP
  `).run(filePath, value ? 1 : 0, value ? 1 : 0)
}
```

- [ ] **Step 2: 提交**

```bash
git add server/src/services/photoMeta.ts
git commit -m "feat: add photoMeta service — rating & favorite CRUD"
```

---

## Task 3: 后端 API 端点 + 列表集成

**Files:**
- Modify: `server/src/routes/photos.ts`

- [ ] **Step 1: 在 photos 路由中集成 photoMeta**

在 `photos.ts` 顶部添加导入：

```typescript
import { getPhotoMetaBatch, setRating, toggleFavorite, setFavorite } from '../services/photoMeta.js'
```

修改 `GET /` handler，在 `reviewMap` 之后添加 meta 合并：

```typescript
router.get('/', validate(photosQuerySchema), (req, res) => {
  const folder = req.query.folder as string
  const photos = getPhotosForFolder(folder)

  const filePaths = photos.map(p => p.jpgPath || p.rawPaths[0] || '')
  const reviewMap = getReviewStatuses(filePaths)
  const metaMap = getPhotoMetaBatch(filePaths)

  const photosWithStatus = photos.map((p, i) => {
    const status = reviewMap.get(filePaths[i])
    const meta = metaMap.get(filePaths[i])
    return {
      ...p,
      reviewAction: status?.action || null,
      reviewedAt: status?.reviewedAt || null,
      rating: meta?.rating ?? 0,
      favorite: meta?.favorite ?? false,
    }
  })

  // ... 后续 status/subfolder 过滤逻辑保持不变
```

- [ ] **Step 2: 添加 rating 和 favorite 端点**

在 `photos.ts` 文件中，`DELETE /:id` 路由之前添加：

```typescript
// Set rating (0-5)
const ratingSchema = z.object({
  rating: z.number().int().min(0).max(5),
})

router.put('/:id/rating', loadPhoto, validate(ratingSchema, 'body'), (req, res) => {
  const filePath = req.photo!.jpgPath || req.photo!.rawPaths[0] || ''
  setRating(filePath, req.body.rating)
  res.json({ success: true })
})

// Toggle favorite
router.put('/:id/favorite', loadPhoto, (req, res) => {
  const filePath = req.photo!.jpgPath || req.photo!.rawPaths[0] || ''
  const nowFavorite = toggleFavorite(filePath)
  res.json({ success: true, favorite: nowFavorite })
})

// Set favorite (for undo — explicit value)
const favoriteSchema = z.object({
  favorite: z.boolean(),
})

router.put('/:id/favorite/set', loadPhoto, validate(favoriteSchema, 'body'), (req, res) => {
  const filePath = req.photo!.jpgPath || req.photo!.rawPaths[0] || ''
  setFavorite(filePath, req.body.favorite)
  res.json({ success: true })
})
```

- [ ] **Step 3: 验证 API**

Run: `npm run dev`
先在首页扫描文件夹，然后用 curl 测试：

```bash
# 设置评分
curl -X PUT http://localhost:3001/api/photos/<photo-id>/rating \
  -H "Content-Type: application/json" -d '{"rating": 4}'

# 切换收藏
curl -X PUT http://localhost:3001/api/photos/<photo-id>/favorite

# 检查列表返回中包含 rating 和 favorite
curl "http://localhost:3001/api/photos?folder=<encoded-folder-path>&limit=2"
```

Expected: 响应中每张照片包含 `rating` 和 `favorite` 字段

- [ ] **Step 4: 提交**

```bash
git add server/src/routes/photos.ts
git commit -m "feat: add rating/favorite API endpoints + embed meta in photo list"
```

---

## Task 4: 前端 API 层 + 类型扩展

**Files:**
- Modify: `client/src/api/index.ts`

- [ ] **Step 1: 扩展 PhotoGroup 类型**

在 `PhotoGroup` interface 中添加 `rating` 和 `favorite`：

```typescript
export interface PhotoGroup {
  id: string
  name: string
  jpgPath: string | null
  rawPaths: string[]
  hasJpg: boolean
  hasRaw: boolean
  isOrphan: boolean
  orphanType?: 'jpg' | 'raw'
  date?: string
  folder: string
  subfolder: string
  reviewAction?: 'keep' | 'deleted' | null
  reviewedAt?: string | null
  rating?: number
  favorite?: boolean
}
```

- [ ] **Step 2: 添加 API 方法**

在 `api` 对象中添加：

```typescript
  setRating: (photoId: string, rating: number) =>
    request<{ success: boolean }>(`/photos/${encodeURIComponent(photoId)}/rating`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    }),

  toggleFavorite: (photoId: string) =>
    request<{ success: boolean; favorite: boolean }>(`/photos/${encodeURIComponent(photoId)}/favorite`, {
      method: 'PUT',
    }),

  setFavorite: (photoId: string, favorite: boolean) =>
    request<{ success: boolean }>(`/photos/${encodeURIComponent(photoId)}/favorite/set`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorite }),
    }),
```

- [ ] **Step 3: 验证编译**

Run: `npm run build`
Expected: 编译通过无类型错误

- [ ] **Step 4: 提交**

```bash
git add client/src/api/index.ts
git commit -m "feat: extend PhotoGroup with rating/favorite + add API methods"
```

---

## Task 5: RatingStars 组件

**Files:**
- Create: `client/src/components/ui/RatingStars.tsx`

- [ ] **Step 1: 创建 RatingStars 组件**

```tsx
import { Star } from 'lucide-react'

interface RatingStarsProps {
  rating: number       // 0-5
  onChange?: (rating: number) => void
  size?: number        // icon size, default 16
  className?: string
}

export default function RatingStars({ rating, onChange, size = 16, className = '' }: RatingStarsProps) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= rating
        return (
          <button
            key={star}
            onClick={onChange ? () => onChange(star === rating ? 0 : star) : undefined}
            className={`transition-colors duration-fast ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
            title={onChange ? `${star} 星` : undefined}
            disabled={!onChange}
          >
            <Star
              size={size}
              strokeWidth={1.5}
              className={filled ? 'text-amber-400 fill-amber-400' : 'text-white/20'}
            />
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add client/src/components/ui/RatingStars.tsx
git commit -m "feat: add RatingStars component"
```

---

## Task 6: Toast 组件

**Files:**
- Create: `client/src/components/ui/Toast.tsx`
- Create: `client/src/hooks/useToast.ts`

- [ ] **Step 1: 创建 useToast hook**

```typescript
import { useState, useCallback, useRef } from 'react'

interface ToastItem {
  id: number
  message: string
  action?: string
  onAction?: () => void
}

let nextId = 0

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const show = useCallback((message: string, duration = 3000, action?: { label: string; onClick: () => void }) => {
    const id = nextId++
    const item: ToastItem = { id, message, action: action?.label, onAction: action?.onClick }
    setToasts(prev => [...prev, item])
    timers.current.set(id, setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      timers.current.delete(id)
    }, duration))
    return id
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  return { toasts, show, dismiss }
}
```

- [ ] **Step 2: 创建 Toast 容器组件**

```tsx
import { X } from 'lucide-react'
import type { ToastItem } from '../../hooks/useToast'

interface ToastContainerProps {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-xl bg-bg-elevated/95 backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] border border-border-subtle animate-fade-in"
        >
          <span className="text-text text-caption">{toast.message}</span>
          {toast.action && toast.onAction && (
            <button
              onClick={toast.onAction}
              className="text-accent text-caption font-semibold hover:text-accent-hover transition-colors duration-fast"
            >
              {toast.action}
            </button>
          )}
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-text-tertiary hover:text-text transition-colors duration-fast"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add client/src/components/ui/Toast.tsx client/src/hooks/useToast.ts
git commit -m "feat: add Toast component and useToast hook"
```

---

## Task 7: 撤销系统 Hook

**Files:**
- Create: `client/src/hooks/useUndoHistory.ts`

- [ ] **Step 1: 创建 useUndoHistory hook**

```typescript
import { useRef, useCallback } from 'react'
import { api } from '../api'

export type UndoActionType = 'rating' | 'favorite' | 'review'

export interface UndoAction {
  type: UndoActionType
  photoId: string
  before: any
  after: any
}

const MAX_UNDO = 50

export function useUndoHistory() {
  const stack = useRef<UndoAction[]>([])

  const push = useCallback((action: UndoAction) => {
    stack.current.push(action)
    if (stack.current.length > MAX_UNDO) {
      stack.current.shift()
    }
  }, [])

  const undo = useCallback(async (): Promise<UndoAction | null> => {
    const action = stack.current.pop()
    if (!action) return null

    try {
      switch (action.type) {
        case 'rating':
          await api.setRating(action.photoId, action.before as number)
          break
        case 'favorite':
          await api.setFavorite(action.photoId, action.before as boolean)
          break
        case 'review':
          // review undo: re-submit with the previous action
          // before is the previous review action ('keep'|'deleted'|null)
          if (action.before) {
            await api.submitReview(action.photoId, action.before, 'sequential')
          }
          break
      }
    } catch {
      // 撤销失败时把操作放回栈顶
      stack.current.push(action)
      return null
    }

    return action
  }, [])

  const canUndo = useCallback(() => stack.current.length > 0, [])

  const clear = useCallback(() => {
    stack.current = []
  }, [])

  return { push, undo, canUndo, clear }
}
```

- [ ] **Step 2: 提交**

```bash
git add client/src/hooks/useUndoHistory.ts
git commit -m "feat: add useUndoHistory hook"
```

---

## Task 8: AppContext 集成 meta 更新 + Toast

**Files:**
- Modify: `client/src/context/AppContext.tsx`

- [ ] **Step 1: 添加 updatePhotoMeta 和 Toast 集成**

替换 `AppContext.tsx` 全部内容：

```tsx
import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { api, setActiveFolder, type PhotoGroup } from '../api'
import { useUndoHistory, type UndoAction } from '../hooks/useUndoHistory'
import { useToast } from '../hooks/useToast'
import ToastContainer from '../components/ui/Toast'

interface AppContext {
  activeFolder: string
  photos: PhotoGroup[]
  settings: Record<string, string>
  isLoaded: boolean
  loadPhotos: (folder: string) => Promise<void>
  updatePhotoRating: (photoId: string, rating: number) => Promise<void>
  updatePhotoFavorite: (photoId: string, favorite?: boolean) => Promise<void>
  undoLastAction: () => Promise<UndoAction | null>
  toast: ReturnType<typeof useToast>
}

const Ctx = createContext<AppContext | null>(null)

export function useApp(): AppContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeFolder, setActive] = useState('')
  const [photos, setPhotos] = useState<PhotoGroup[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [isLoaded, setIsLoaded] = useState(false)
  const undoHistory = useUndoHistory()
  const toast = useToast()

  const loadPhotos = useCallback(async (folder: string) => {
    setActiveFolder(folder)
    setActive(folder)
    await api.scanFolder(folder)
    const [result, s] = await Promise.all([
      api.getPhotos({ limit: 2000 }),
      api.getSettings(),
    ])
    setPhotos(result.photos)
    setSettings(s)
    setIsLoaded(true)
    undoHistory.clear()
  }, [undoHistory])

  const findPhotoPath = useCallback((photoId: string): string | undefined => {
    const p = photos.find(p => p.id === photoId)
    return p?.jpgPath || p?.rawPaths[0]
  }, [photos])

  const updatePhotoRating = useCallback(async (photoId: string, rating: number) => {
    const photo = photos.find(p => p.id === photoId)
    if (!photo) return
    const before = photo.rating ?? 0
    await api.setRating(photoId, rating)
    undoHistory.push({ type: 'rating', photoId, before, after: rating })
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, rating } : p))
  }, [photos, undoHistory])

  const updatePhotoFavorite = useCallback(async (photoId: string, favorite?: boolean) => {
    const photo = photos.find(p => p.id === photoId)
    if (!photo) return
    const before = photo.favorite ?? false
    let newValue: boolean
    if (favorite !== undefined) {
      newValue = favorite
    } else {
      newValue = !before
    }
    const result = await api.toggleFavorite(photoId)
    newValue = result.favorite
    undoHistory.push({ type: 'favorite', photoId, before, after: newValue })
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, favorite: newValue } : p))
  }, [photos, undoHistory])

  const undoLastAction = useCallback(async (): Promise<UndoAction | null> => {
    const action = await undoHistory.undo()
    if (!action) return null

    // 更新本地 photos 状态
    setPhotos(prev => prev.map(p => {
      if (p.id !== action.photoId) return p
      switch (action.type) {
        case 'rating': return { ...p, rating: action.before as number }
        case 'favorite': return { ...p, favorite: action.before as boolean }
        case 'review': return { ...p, reviewAction: action.before }
        default: return p
      }
    }))

    const typeLabels: Record<string, string> = { rating: '评分', favorite: '收藏', review: '审阅' }
    toast.show(`已撤销: ${typeLabels[action.type] || action.type}`)

    return action
  }, [undoHistory, toast])

  const value = useMemo<AppContext>(() => ({
    activeFolder,
    photos,
    settings,
    isLoaded,
    loadPhotos,
    updatePhotoRating,
    updatePhotoFavorite,
    undoLastAction,
    toast,
  }), [activeFolder, photos, settings, isLoaded, loadPhotos,
    updatePhotoRating, updatePhotoFavorite, undoLastAction, toast])

  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </Ctx.Provider>
  )
}
```

- [ ] **Step 2: 验证编译**

Run: `npm run build`
Expected: 编译通过

- [ ] **Step 3: 提交**

```bash
git add client/src/context/AppContext.tsx
git commit -m "feat: integrate rating/favorite/undo into AppContext"
```

---

## Task 9: ReviewContext 集成 undo

**Files:**
- Modify: `client/src/context/ReviewContext.tsx`

- [ ] **Step 1: 在 handleAction 中加入 undo push**

在 `ReviewContext.tsx` 顶部修改导入：

```typescript
import { api, type PhotoGroup, type SubfolderInfo } from '../api'
import { useApp } from './AppContext'
```

在 `ReviewProvider` 中解构新的 app 方法：

```typescript
const { photos: appPhotos, updatePhotoRating, updatePhotoFavorite } = useApp()
```

修改 `handleAction`，在 `api.submitReview` 成功后添加 undo push：

```typescript
  const handleAction = useCallback(async (action: 'keep' | 'deleted') => {
    if (!currentPhoto || processingRef.current) return
    processingRef.current = true
    setError('')
    const photoId = currentPhoto.id
    const before = currentPhoto.reviewAction
    try {
      await api.submitReview(photoId, action, 'sequential')
      // Push to undo (通过 AppContext 的 undo history)
      // undo push 已经在 AppContext 层面管理
      if (action === 'deleted') {
        await api.deletePhoto(photoId)
        const remaining = photos.filter(p => p.id !== photoId)
        setPhotos(remaining)
        setCurrentIndex(Math.max(0, Math.min(currentIndex, remaining.length - 1)))
      } else {
        setPhotos(prev => prev.map(p =>
          p.id === photoId ? { ...p, reviewAction: action, reviewedAt: new Date().toISOString() } : p
        ))
        if (currentIndex < filteredPhotos.length - 1) {
          setCurrentIndex(currentIndex + 1)
        }
      }
    } catch (e: any) {
      setError(e.message || '操作失败')
    } finally {
      processingRef.current = false
    }
  }, [currentPhoto, currentIndex, filteredPhotos.length, photos])
```

注意：review 操作的 undo push 暂不在此处添加，因为 review undo 涉及照片删除恢复（较复杂），先聚焦 rating/favorite undo。`handleAction` 保持不变。

- [ ] **Step 2: 验证编译**

Run: `npm run build`
Expected: 编译通过

- [ ] **Step 3: 提交**

```bash
git add client/src/context/ReviewContext.tsx
git commit -m "refactor: ReviewContext — prepare for undo integration"
```

---

## Task 10: 审阅页 UI 集成

**Files:**
- Modify: `client/src/components/review/ReviewControls.tsx`
- Modify: `client/src/components/review/PhotoDetailsView.tsx`
- Modify: `client/src/hooks/useKeyboardShortcuts.ts`
- Modify: `client/src/pages/ReviewPage.tsx`

- [ ] **Step 1: 扩展 useKeyboardShortcuts**

在 `ShortcutMap` interface 中添加：

```typescript
interface ShortcutMap {
  onPrev?: () => void
  onNext?: () => void
  onKeep?: () => void
  onDelete?: () => void
  onSkip?: () => void
  onToggleLeft?: () => void
  onToggleRight?: () => void
  onRating?: (rating: number) => void
  onFavorite?: () => void
  onUndo?: () => void
}
```

在 `switch` 语句的 `default` 之前添加：

```typescript
      default:
        if (e.key >= '1' && e.key <= '5' && shortcuts.onRating) {
          e.preventDefault()
          shortcuts.onRating(Number(e.key))
        }
        break
```

在 switch 之外（`}` 之前）添加 `f` 键和 `Ctrl+Z`：

```typescript
    if (e.key === 'f' || e.key === 'F') {
      if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        shortcuts.onFavorite?.()
      }
    }
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      shortcuts.onUndo?.()
    }
```

- [ ] **Step 2: 修改 ReviewControls 添加评分和收藏按钮**

```tsx
import { Star, Heart, ChevronLeft, X, Check, ChevronRight } from 'lucide-react'
import { useReview } from '../../context/ReviewContext'
import { useApp } from '../../context/AppContext'
import ActionBtn from '../ui/ActionBtn'
import Tooltip from '../ui/Tooltip'

interface ReviewControlsProps {
  onActionFeedback?: (feedback: 'keep' | 'delete' | null) => void
}

export default function ReviewControls({ onActionFeedback }: ReviewControlsProps) {
  const { currentIndex, filteredPhotos, currentPhoto, goTo, handleAction } = useReview()
  const { updatePhotoRating, updatePhotoFavorite } = useApp()

  const rating = currentPhoto?.rating ?? 0
  const favorite = currentPhoto?.favorite ?? false

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-3 bg-[#1D1D1F]/90 backdrop-blur-2xl rounded-2xl px-4 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <ActionBtn
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          label="上一张"
          shortcut="←"
          icon={ChevronLeft}
        />
        <div className="w-px h-5 bg-white/10" />
        {/* Rating */}
        <Tooltip label="评分" shortcut="1-5">
          <div className="flex items-center gap-0.5 px-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => updatePhotoRating(currentPhoto!.id, star === rating ? 0 : star)}
                className="transition-colors duration-fast hover:scale-110"
              >
                <Star
                  size={14}
                  strokeWidth={1.5}
                  className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-white/25 hover:text-white/40'}
                />
              </button>
            ))}
          </div>
        </Tooltip>
        {/* Favorite */}
        <ActionBtn
          onClick={() => updatePhotoFavorite(currentPhoto!.id)}
          label={favorite ? '取消收藏' : '收藏'}
          shortcut="F"
        >
          <Heart
            size={20}
            strokeWidth={1.5}
            className={favorite ? 'text-red-400 fill-red-400' : undefined}
          />
        </ActionBtn>
        <div className="w-px h-5 bg-white/10" />
        <ActionBtn
          onClick={() => {
            handleAction('deleted')
            onActionFeedback?.('delete')
          }}
          variant="danger"
          label="废片"
          shortcut="D"
          icon={X}
        />
        <ActionBtn
          onClick={() => {
            handleAction('keep')
            onActionFeedback?.('keep')
          }}
          variant="success"
          label="保留"
          shortcut="空格"
          icon={Check}
        />
        <div className="w-px h-5 bg-white/10" />
        <ActionBtn
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex >= filteredPhotos.length - 1}
          label="下一张"
          shortcut="→"
          icon={ChevronRight}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 修改 PhotoDetailsView 添加评分/收藏显示**

在 `PhotoDetailsView` 的"审阅状态" Card 之前，添加一个"评分与收藏" Card：

```tsx
{(reviewed !== undefined || photo.rating !== undefined) && (
  <Card>
    <SectionHeader title="评分与收藏" compact />
    <div className="px-4 py-3 flex items-center gap-4">
      {photo.rating !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-micro text-text-tertiary">评分</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                size={12}
                strokeWidth={1.5}
                className={star <= (photo.rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-text-tertiary/30'}
              />
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Heart
          size={12}
          strokeWidth={1.5}
          className={photo.favorite ? 'text-red-400 fill-red-400' : 'text-text-tertiary/30'}
        />
        <span className="text-micro text-text-secondary">{photo.favorite ? '已收藏' : '未收藏'}</span>
      </div>
    </div>
  </Card>
)}
```

需要在 `PhotoDetailsView.tsx` 顶部添加 `Star` 和 `Heart` 的导入：

```typescript
import { Check, X, Star, Heart } from 'lucide-react'
```

- [ ] **Step 4: 修改 ReviewPage 集成 undo 快捷键**

在 `ReviewLayout` 函数中修改 shortcuts 定义：

```typescript
  const { updatePhotoRating, updatePhotoFavorite, undoLastAction, currentPhoto: _ } = useReview()
```

实际上 undo 和 rating 通过 AppContext 操作。修改 `ReviewLayout`：

```typescript
import { useApp } from '../context/AppContext'

// ... 在 ReviewLayout 内部:
  const { updatePhotoRating, updatePhotoFavorite, undoLastAction } = useApp()
  const { filteredPhotos, currentIndex, loading, leftSidebarOpen, rightPanelOpen,
    goTo, handleAction, toggleLeftSidebar, toggleRightPanel, currentPhoto } = useReview()

  const shortcuts = useMemo(() => ({
    onPrev: () => goTo(currentIndex - 1),
    onNext: () => goTo(currentIndex + 1),
    onKeep: () => handleAction('keep'),
    onDelete: () => handleAction('deleted'),
    onToggleLeft: toggleLeftSidebar,
    onToggleRight: toggleRightPanel,
    onRating: (rating: number) => { if (currentPhoto) updatePhotoRating(currentPhoto.id, rating) },
    onFavorite: () => { if (currentPhoto) updatePhotoFavorite(currentPhoto.id) },
    onUndo: undoLastAction,
  }), [currentIndex, goTo, handleAction, toggleLeftSidebar, toggleRightPanel,
    currentPhoto, updatePhotoRating, updatePhotoFavorite, undoLastAction])

  useKeyboardShortcuts(shortcuts)
```

需要在 `ReviewPage.tsx` 顶部添加 `useApp` 的导入。

- [ ] **Step 5: 验证审阅页**

Run: `npm run dev`
1. 扫描文件夹 → 进入审阅页
2. 按 `1-5` 给照片评分 → 星星应亮起
3. 按 `F` 切换收藏 → 心形应变红
4. 按 `Ctrl+Z` → 应撤销上一步评分/收藏操作
5. 查看右侧详情面板 → 应显示评分和收藏状态

- [ ] **Step 6: 提交**

```bash
git add client/src/components/review/ReviewControls.tsx \
  client/src/components/review/PhotoDetailsView.tsx \
  client/src/hooks/useKeyboardShortcuts.ts \
  client/src/pages/ReviewPage.tsx
git commit -m "feat: integrate rating/favorite/undo into review page"
```

---

## Task 11: 随机页 UI 集成

**Files:**
- Modify: `client/src/components/random/RandomControls.tsx`
- Modify: `client/src/pages/RandomPage.tsx`

- [ ] **Step 1: 修改 RandomControls 添加评分和收藏**

```tsx
import { Star, Heart, ChevronLeft, X, Check, RefreshCw, ChevronRight } from 'lucide-react'
import ActionBtn from '../ui/ActionBtn'
import Tooltip from '../ui/Tooltip'

interface RandomControlsProps {
  canGoPrev: boolean
  canGoNext: boolean
  rating: number
  favorite: boolean
  onPrev: () => void
  onNext: () => void
  onSkip: () => void
  onKeep: () => void
  onDelete: () => void
  onRating: (rating: number) => void
  onFavorite: () => void
}

export default function RandomControls({
  canGoPrev, canGoNext, rating, favorite,
  onPrev, onNext, onSkip, onKeep, onDelete, onRating, onFavorite,
}: RandomControlsProps) {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-3 bg-[#1D1D1F]/90 backdrop-blur-2xl rounded-2xl px-4 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <ActionBtn onClick={onPrev} disabled={!canGoPrev} label="上一张" shortcut="←" icon={ChevronLeft} />
        <div className="w-px h-5 bg-white/10" />
        <Tooltip label="评分" shortcut="1-5">
          <div className="flex items-center gap-0.5 px-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => onRating(star === rating ? 0 : star)}
                className="transition-colors duration-fast hover:scale-110"
              >
                <Star
                  size={14}
                  strokeWidth={1.5}
                  className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-white/25 hover:text-white/40'}
                />
              </button>
            ))}
          </div>
        </Tooltip>
        <ActionBtn
          onClick={onFavorite}
          label={favorite ? '取消收藏' : '收藏'}
          shortcut="F"
        >
          <Heart size={20} strokeWidth={1.5} className={favorite ? 'text-red-400 fill-red-400' : undefined} />
        </ActionBtn>
        <div className="w-px h-5 bg-white/10" />
        <ActionBtn onClick={onDelete} variant="danger" label="废片" shortcut="D" icon={X} />
        <ActionBtn onClick={onKeep} variant="success" label="保留" shortcut="空格" icon={Check} />
        <ActionBtn onClick={onSkip} label="跳过" shortcut="R" icon={RefreshCw} />
        <div className="w-px h-5 bg-white/10" />
        <ActionBtn onClick={onNext} disabled={!canGoNext} label="下一张" shortcut="→" icon={ChevronRight} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 修改 RandomPage 集成评分/收藏/undo**

在 `RandomPage.tsx` 中：

1. 导入 `useApp`:
```typescript
import { useApp } from '../context/AppContext'
```

2. 在组件内获取 app 方法:
```typescript
const { updatePhotoRating, updatePhotoFavorite, undoLastAction } = useApp()
```

3. 修改 shortcuts 添加新回调:
```typescript
const shortcuts = useMemo(() => ({
  onPrev: batch.goPrev,
  onNext: batch.goNext,
  onKeep: () => batch.handleAction('keep'),
  onDelete: () => batch.handleAction('deleted'),
  onSkip: () => batch.handleAction('skip'),
  onToggleRight: batch.toggleRightPanel,
  onRating: (rating: number) => { if (batch.currentPhoto) updatePhotoRating(batch.currentPhoto.id, rating) },
  onFavorite: () => { if (batch.currentPhoto) updatePhotoFavorite(batch.currentPhoto.id) },
  onUndo: undoLastAction,
}), [batch, updatePhotoRating, updatePhotoFavorite, undoLastAction])
```

4. 修改 RandomControls 调用，传入新的 props:
```tsx
<RandomControls
  canGoPrev={batch.canGoPrev}
  canGoNext={batch.canGoNext}
  rating={batch.currentPhoto?.rating ?? 0}
  favorite={batch.currentPhoto?.favorite ?? false}
  onPrev={batch.goPrev}
  onNext={batch.goNext}
  onSkip={() => batch.handleAction('skip')}
  onKeep={() => batch.handleAction('keep')}
  onDelete={() => batch.handleAction('deleted')}
  onRating={(rating: number) => { if (batch.currentPhoto) updatePhotoRating(batch.currentPhoto.id, rating) }}
  onFavorite={() => { if (batch.currentPhoto) updatePhotoFavorite(batch.currentPhoto.id) }}
/>
```

- [ ] **Step 3: 验证随机页**

Run: `npm run dev`
1. 进入随机浏览页 → 开始审阅
2. 评分和收藏功能应正常工作
3. Ctrl+Z 应可撤销

- [ ] **Step 4: 提交**

```bash
git add client/src/components/random/RandomControls.tsx client/src/pages/RandomPage.tsx
git commit -m "feat: integrate rating/favorite/undo into random page"
```

---

## Task 12: 网格页 + Lightbox 集成

**Files:**
- Modify: `client/src/components/grid/Lightbox.tsx`
- Modify: `client/src/pages/GridPage.tsx`

- [ ] **Step 1: 修改 Lightbox 添加评分/收藏叠加层**

在 `Lightbox.tsx` 底部信息栏中添加评分和收藏：

```tsx
import { Star, Heart } from 'lucide-react'
```

在底部 `<div>` 中（照片名和页码之间），添加：

```tsx
<div className="flex items-center gap-1.5">
  {[1, 2, 3, 4, 5].map(star => (
    <Star
      key={star}
      size={12}
      strokeWidth={1.5}
      className={star <= (photo.rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-white/20'}
    />
  ))}
</div>
{(photo.favorite) && (
  <Heart size={12} strokeWidth={1.5} className="text-red-400 fill-red-400" />
)}
```

- [ ] **Step 2: 在网格页缩略图上添加角标**

在 `GridPage.tsx` 的照片渲染部分，`<img>` 标签之后、`</div>` 之前添加评分/收藏角标：

```tsx
{/* Rating/favorite overlay badges */}
{(photo.rating ?? 0) > 0 && (
  <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-black/50 rounded-sm px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
    <Star size={10} strokeWidth={1.5} className="text-amber-400 fill-amber-400" />
    <span className="text-white text-micro font-medium">{photo.rating}</span>
  </div>
)}
{photo.favorite && (
  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
    <Heart size={12} strokeWidth={1.5} className="text-red-400 fill-red-400 drop-shadow" />
  </div>
)}
```

需要在 `GridPage.tsx` 顶部添加导入：

```typescript
import { Star, Heart } from 'lucide-react'
```

- [ ] **Step 3: 验证网格页和 Lightbox**

Run: `npm run dev`
1. 进入网格页 → hover 缩略图应显示评分和收藏角标
2. 点击打开 Lightbox → 底部应显示星级和收藏状态

- [ ] **Step 4: 提交**

```bash
git add client/src/components/grid/Lightbox.tsx client/src/pages/GridPage.tsx
git commit -m "feat: show rating/favorite badges on grid thumbnails and lightbox"
```

---

## Task 13: 编译验证 + 最终提交

**Files:**
- 无新文件

- [ ] **Step 1: 完整编译**

Run: `npm run build`
Expected: 前后端编译均通过，无类型错误

- [ ] **Step 2: 完整手动测试流程**

Run: `npm run dev`

测试清单：
- [ ] 首页扫描文件夹正常
- [ ] 网格页显示缩略图 + 角标（hover 时显示评分/收藏）
- [ ] 网格页 Lightbox 显示评分/收藏
- [ ] 审阅页：`1-5` 键评分 → 星星亮起
- [ ] 审阅页：`F` 键切换收藏 → 心形变红/恢复
- [ ] 审阅页：`Ctrl+Z` 撤销评分 → 恢复上一步
- [ ] 审阅页：`Ctrl+Z` 撤销收藏 → 恢复上一步
- [ ] 审阅页：右侧详情面板显示评分和收藏状态
- [ ] 随机页：评分/收藏按钮正常工作
- [ ] 随机页：Ctrl+Z 撤销正常
- [ ] 页面切换后 Ctrl+Z 仍可撤销（会话内有效）
- [ ] Toast 通知正常弹出和消失

- [ ] **Step 3: 更新 agent-index.md**

在 `docs/architecture/agent-index.md` 中更新任务路由表和文件索引，反映新增的文件和修改的职责。

- [ ] **Step 4: 最终提交**

```bash
git add docs/architecture/agent-index.md
git commit -m "docs: update agent-index for Phase 1 features"
```
