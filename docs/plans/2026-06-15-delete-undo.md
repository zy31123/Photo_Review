# 删除撤销（Command+Z）实现计划

## Context

当前所有删除操作（审阅页、随机页、相似页）都没有撤销支持，没有 toast 反馈。用户选择"Cmd+Z 无限撤销"方案：删除后即使 toast 消失，仍可通过 Cmd+Z 恢复。

**核心设计**：不再使用 OS 回收站（`trash` 库），改用**应用级回收站**（`os.tmpdir()/.photoreview-trash/`）。删除时将文件移入应用回收站并记录原始路径；撤销时将文件移回原始位置并重新入库。

## 实现方案

### 1. 后端：应用级回收站服务

**新建 `server/src/services/trash.ts`**

```
TRASH_DIR = os.tmpdir()/.photoreview-trash/

moveToTrash(photo: PhotoGroup) → { trashPaths: Record<originalPath, trashPath> }
  - 创建 TRASH_DIR/{photoId}/ 子目录
  - 将 jpgPath、rawPaths 逐个移入（fs.renameSync 优先，跨分区 fallback 到 copy+unlink）
  - 失败时 fallback 到 trash 库（OS 回收站）
  - 返回原始路径 → 回收站路径的映射

restoreFromTrash(photoId: string, trashPaths: Record<string,string>) → { restored: string[], failed: string[] }
  - 将文件从回收站移回原始路径
  - 清理回收站子目录
  - 返回恢复/失败的路径列表
```

### 2. 后端：数据库迁移

**修改 `server/src/db/migrations.ts`** — 新增 version 4：

```sql
CREATE TABLE IF NOT EXISTS deleted_photos (
  id TEXT PRIMARY KEY,
  original_paths TEXT NOT NULL,  -- JSON: ["/path/to/file.jpg", ...]
  trash_paths TEXT NOT NULL,     -- JSON: {"/original": "/trash/original", ...}
  photo_data TEXT NOT NULL,      -- JSON: 完整 PhotoGroup 数据
  folder TEXT NOT NULL,
  deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3. 后端：scanner.ts 新增 addPhoto

**修改 `server/src/services/scanner.ts`**

```
addPhoto(photo: PhotoGroup): void
  - 检查 photoIndex 是否已存在（避免重复）
  - 重新加入 photoStore[folder] 和 photoIndex[id]
```

### 4. 后端：review.ts 新增清除审阅记录

**修改 `server/src/services/review.ts`**

```
deleteReviewRecord(filePath: string): void
  - DELETE FROM review_records WHERE file_path = ?
```

### 5. 后端：恢复 API 端点

**修改 `server/src/routes/photos.ts`** — 新增两个端点：

```
POST /api/photos/restore
  body: { photoId, trashPaths, previousReviewAction? }
  - restoreFromTrash(photoId, trashPaths)
  - 从 deleted_photos 表读取 photoData
  - scanner.addPhoto(photoData)
  - 删除 deleted_photos 记录
  - 如有 previousReviewAction，恢复审阅记录；否则清除审阅记录
  - 返回恢复后的 PhotoGroup

POST /api/photos/restore-batch
  body: { items: [{ photoId, trashPaths, previousReviewAction? }...] }
  - 批量恢复（事务内）
  - 返回恢复的 PhotoGroup[]
```

**修改 DELETE /api/photos/:id**：
- 使用 `moveToTrash` 替代 `deletePhoto`（trash 库调用）
- 将 photo 完整数据写入 `deleted_photos` 表
- 保留 `removePhoto` 从内存移除

### 6. 前端 API 层

**修改 `client/src/api/index.ts`**

```typescript
restorePhoto: (data: { photoId: string; trashPaths: Record<string,string>; previousReviewAction?: string | null })
  → Promise<{ success: boolean; photo: PhotoGroup }>

restorePhotos: (items: Array<{ photoId: string; trashPaths: Record<string,string>; previousReviewAction?: string | null }>)
  → Promise<{ success: boolean; photos: PhotoGroup[] }>

deleteReview: (photoId: string)
  → Promise<{ success: boolean }>  // 新增：清除审阅记录
```

### 7. 前端：扩展 UndoAction 类型

**修改 `client/src/hooks/useUndoHistory.ts`**

```typescript
type UndoActionType = 'rating' | 'favorite' | 'review' | 'delete' | 'delete_batch'

interface UndoAction {
  type: UndoActionType
  photoId: string
  before: any
  after: any
  // 删除专用字段
  photoData?: PhotoGroup           // 删除前的完整照片数据
  trashPaths?: Record<string,string>  // 原始路径 → 回收站路径
  previousReviewAction?: string | null // 删除前的审阅状态（null = 未审阅）
  // 批量删除专用
  items?: Array<{
    photoId: string
    photoData: PhotoGroup
    trashPaths: Record<string,string>
    previousReviewAction?: string | null
  }>
}
```

新增 `'delete'` 和 `'delete_batch'` case 到 `undo()` switch：
- `'delete'`: 调用 `api.restorePhoto({ photoId, trashPaths, previousReviewAction })`
- `'delete_batch'`: 调用 `api.restorePhotos(items)`
- 失败时推回栈中

### 8. 前端：跨组件事件系统

**新建 `client/src/hooks/photoEvents.ts`**

```typescript
// 轻量发布/订阅，用于 AppContext → 页面 Context 通知照片恢复
type RestorePayload = { photoId: string; photo: PhotoGroup }

export const photoEvents = {
  _l: new Map<string, Set<(d: any) => void>>(),
  on(e: string, fn: (d: any) => void) { ... },
  off(e: string, fn: (d: any) => void) { ... },
  emit(e: string, data: any) { ... },
}
```

### 9. 前端：AppContext 整合

**修改 `client/src/context/AppContext.tsx`**

`undoLastAction` 扩展：

```
'delete' undo:
  1. restored = await api.restorePhoto({ photoId, trashPaths, previousReviewAction })
  2. setPhotos(prev => [...prev, restored.photo])  // 加回全局列表
  3. photoEvents.emit('photo:restored', { photoId, photo: restored.photo })
  4. toast.show('已恢复: IMG_xxxx')

'delete_batch' undo:
  1. restored = await api.restorePhotos(items)
  2. setPhotos(prev => [...prev, ...restored.photos])
  3. photoEvents.emit('photos:restored-batch', { photos: restored.photos })
  4. toast.show(`已恢复 ${n} 张照片`, 3000, { label: '撤销', onClick: () => { 重新批量删除 } })
```

### 10. 前端：ReviewContext 删除 + 撤销

**修改 `client/src/context/ReviewContext.tsx`**

`handleAction('deleted')` 改造：
```
1. await api.submitReview(photoId, 'deleted', 'sequential')
2. await api.deletePhoto(photoId)  ← 现在会移入应用回收站
3. push undo: { type: 'delete', photoId, photoData: currentPhoto, trashPaths: 从响应获取, previousReviewAction: null }
4. 从本地 photos 移除
5. toast.show('已删除: IMG_xxx', 5000, { label: '撤销', onClick: () => undoLastAction() })
```

注意：`deletePhoto` API 需修改返回值，包含 `trashPaths`。

新增 photoEvents 监听：
```typescript
useEffect(() => {
  const handler = ({ photoId, photo }) => {
    setPhotos(prev => {
      if (prev.find(p => p.id === photoId)) return prev  // 已存在
      return [...prev, photo]
    })
  }
  photoEvents.on('photo:restored', handler)
  return () => photoEvents.off('photo:restored', handler)
}, [])
```

### 11. 前端：SimilarContext 删除 + 撤销

**修改 `client/src/context/SimilarContext.tsx`**

`deleteSelected()` 改造：
```
1. 收集 toDelete 列表
2. 逐个 await api.deletePhoto(id)，收集成功删除的 { id, trashPaths }
3. push undo: { type: 'delete_batch', photoId: firstId, items: [...], ... }
4. 从 groups 中移除
5. toast.show(`已删除 ${n} 张照片`, 5000, { label: '撤销', onClick: () => undoLastAction() })
```

`directDelete(photoId)` 改造：类似，push `type: 'delete'`。

新增 photoEvents 监听：
```typescript
// photo:restored → 重新插入到正确的 group
// photos:restored-batch → 批量重新插入
```

### 12. 前端：RandomPage 删除 + 撤销

**修改 `client/src/hooks/useRandomBatch.ts`**

`handleAction('deleted')` 改造：
```
1. await api.submitReview(photo.id, 'deleted', 'random')  // 仅标记，不删文件
2. push undo: { type: 'review', photoId, before: null, after: 'deleted' }
   （通过 useApp().undoHistory.push，hook 需要接收 undoHistory 或 push 函数作为参数）
3. 从本地 photos 移除
4. toast.show('已标记废片', 5000, { label: '撤销', onClick: ... })
```

**注意**：`useRandomBatch` 需要接收 `undoHistory.push` 或通过 `useApp()` 获取。

**修改 `useUndoHistory.ts`**：review undo 的 `before: null` 处理：
```typescript
case 'review':
  if (action.before === null) {
    await api.deleteReview(action.photoId)  // 清除审阅记录
  } else if (action.before) {
    await api.submitReview(action.photoId, action.before, 'sequential')
  }
  break
```

### 13. 前端：SimilarPage 快捷键

**修改 `client/src/pages/SimilarPage.tsx`**

添加 `useKeyboardShortcuts({ onUndo: undoLastAction })`，使 Cmd+Z 在相似页生效。

### 14. 后端：修改 deletePhoto 返回值

**修改 `server/src/routes/photos.ts`** DELETE 端点：
```
返回: { success: true, trashPaths: Record<string,string> }
  而非: { success: true, deleted: string[] }
```

## 文件清单

### 新建（2 个）
| 文件 | 职责 |
|------|------|
| `server/src/services/trash.ts` | 应用级回收站（moveToTrash / restoreFromTrash） |
| `client/src/hooks/photoEvents.ts` | 跨组件事件（photo:restored / photos:restored-batch） |

### 修改（13 个）
| 文件 | 变更 |
|------|------|
| `server/src/db/migrations.ts` | 新增 deleted_photos 表 |
| `server/src/services/scanner.ts` | 新增 addPhoto() |
| `server/src/services/review.ts` | 新增 deleteReviewRecord() |
| `server/src/routes/photos.ts` | 修改 DELETE 返回值 + 新增 restore/restore-batch 端点 |
| `client/src/api/index.ts` | 新增 restorePhoto/restorePhotos/deleteReview |
| `client/src/hooks/useUndoHistory.ts` | 新增 delete/delete_batch 类型 + review null 处理 |
| `client/src/context/AppContext.tsx` | undoLastAction 扩展 delete/delete_batch 处理 |
| `client/src/context/ReviewContext.tsx` | 删除推 undo + toast + 监听恢复事件 |
| `client/src/context/SimilarContext.tsx` | 删除推 undo + toast + 监听恢复事件 |
| `client/src/hooks/useRandomBatch.ts` | 删除推 review undo + toast |
| `client/src/pages/SimilarPage.tsx` | 添加 useKeyboardShortcuts (Cmd+Z) |
| `client/src/pages/RandomPage.tsx` | 确保 undo 后页面状态正确更新 |
| `client/src/pages/ReviewPage.tsx` | 确保 undo 后页面状态正确更新 |

## 执行顺序

1. **后端基础**：trash.ts → migrations.ts → scanner.ts (addPhoto) → review.ts (deleteReviewRecord)
2. **后端 API**：routes/photos.ts (修改 DELETE + 新增 restore 端点)
3. **前端基础**：api/index.ts → useUndoHistory.ts → photoEvents.ts
4. **前端整合**：AppContext.tsx → ReviewContext.tsx → SimilarContext.tsx → useRandomBatch.ts
5. **页面层**：SimilarPage.tsx → RandomPage.tsx → ReviewPage.tsx
6. **测试验证**

## 验证方法

1. 审阅页：按 D 删除 → 看到 toast "已删除" + 撤销按钮 → 点撤销 → 照片恢复 → Cmd+Z 再次撤销 → 再次恢复
2. 相似页：选多张 → 批量删除 → toast 显示 → Cmd+Z 全部恢复
3. 随机页：按 D 标记废片 → Cmd+Z 恢复
4. 超时测试：toast 消失后按 Cmd+Z → 仍可恢复（无限撤销）
5. 重启测试：重启服务后，当前会话内的撤销仍可工作（deleted_photos 表持久化）
