# Photo Review 架构优化计划

> 基于完整架构审查生成的实施路线图。分为前端和后端两条线，可独立推进。

## 目标

- 消除数据冗余副本，建立单一数据源
- 前后端类型统一，消除静默漂移
- 后端路由层瘦身，业务逻辑下沉到服务层
- 相似分析模块拆分，纯算法可独立测试
- 修复错误处理链，消除静默失败
- 建立单元测试基础

## 执行策略

- **P0 = 阻塞性架构问题**，必须在功能开发前解决
- **P1 = 高价值重构**，显著提升可维护性和可测试性
- **P2 = 改善性优化**，可在日常开发中逐步推进
- 前端和后端计划可并行推进，互不阻塞
- 每个 Phase 完成后应能通过 `npm run dev` 正常运行 + `npm run test:e2e` 不回归

---

## 后端计划

### Phase 1: 共享类型包 + Scanner 拆分 [P0]
**状态**: done
**预计**: 1-2 天

**目标**: 建立前后端类型共享基础设施，拆解 Scanner 上帝模块

**任务**:
- [x] 1.1 创建 `packages/shared` workspace 包
  - [x] `package.json` (name: `@photo-review/shared`)
  - [x] `src/types.ts` — 定义 PhotoGroup, PhotoGroupWithStatus, ExifData, SubfolderInfo, SimilarGroup, AnalyzeResult, ReviewStatus 等 DTO
  - [x] `src/index.ts` — 导出入口
  - [x] `tsconfig.json`
- [x] 1.2 更新根 `package.json` workspaces 包含 `packages/shared`
- [x] 1.3 更新 client/tsconfig 和 server/tsconfig 引用 shared 包
- [x] 1.4 修复 `hashThreshold` vs `strictThreshold` 参数名不匹配 bug
- [x] 1.5 拆分 `services/scanner.ts`
  - [x] 提取 `services/photoStore.ts` — 内存存储 (photoStore Map, photoIndex Map, getPhotoById, getPhotosForFolder, removePhoto, addPhoto)
  - [x] `scanner.ts` 保留纯扫描逻辑 (scanFolder, 文件遍历, JPG/RAW 配对)
  - [x] 添加 `getPrimaryPath(photo: PhotoGroup): string` 工具函数，替代 6+ 处 `p.jpgPath || p.rawPaths[0]`
- [x] 1.6 将所有 `p.jpgPath || p.rawPaths[0]` 替换为 `getPrimaryPath(p)`
  - 涉及: review.ts, similarity.ts, exif.ts, routes/photos.ts, routes/reviews.ts, image.ts, thumbnailCache.ts, trash.ts, deleter.ts
- [x] 1.7 更新 client/src/api/index.ts 使用 shared 类型
- [x] 1.8 验证: `npm run dev` 正常，`npm run build` 通过，类型检查无错误

**关键文件**:
- `packages/shared/src/types.ts` (新建)
- `server/src/services/scanner.ts` (拆分)
- `server/src/services/photoStore.ts` (新建)
- `server/src/utils/path.ts` (添加 getPrimaryPath)
- `client/src/api/index.ts` (改用 shared 类型)

---

### Phase 2: 路由层瘦身 — photos.ts 业务逻辑提取 [P0]
**状态**: done
**预计**: 1 天

**目标**: routes/photos.ts 从 253 行降到 <100 行，删除/恢复逻辑下沉到服务层

**任务**:
- [x] 2.1 新建 `services/photoLifecycle.ts`
  - [x] `deletePhotoToTrash(photo)` — 移入回收站 + 记 deleted_photos + 移除 scanner 存储
  - [x] `restorePhoto(item)` — 从回收站恢复 + DB 查询 + 重新加入 scanner + 更新审阅记录
  - [x] `restorePhotos(items[])` — 批量恢复（SQLite 事务包裹，消除重复代码）
- [x] 2.2 新建 `services/photoQuery.ts`
  - [x] `getPhotosWithStatus(folder, options)` — 合并 photos + review status + meta + 过滤 + 分页
- [x] 2.3 重写 `routes/photos.ts`
  - [x] DELETE handler → 调用 `photoLifecycle.deletePhotoToTrash()`
  - [x] POST /restore → 调用 `photoLifecycle.restorePhoto()`
  - [x] POST /restore-batch → 调用 `photoLifecycle.restorePhotos()`
  - [x] GET / → 调用 `photoQuery.getPhotosWithStatus()`
- [x] 2.4 移除路由文件中 `import { getDb }` 的直接 DB 访问
- [x] 2.5 为删除+恢复流程添加 SQLite 事务（`db.transaction(() => { ... })`）
- [x] 2.6 验证: `npm run build` 通过，类型检查无错误

**关键文件**:
- `server/src/services/photoLifecycle.ts` (新建)
- `server/src/services/photoQuery.ts` (新建)
- `server/src/routes/photos.ts` (重写)

---

### Phase 3: 相似分析模块拆分 [P0]
**状态**: done
**预计**: 1 天

**目标**: 433 行 similarity.ts 拆为纯算法模块 + 编排层，消除 N+1 查询

**任务**:
- [x] 3.1 新建 `services/similarity/hash.ts`
  - [x] 移入 `computeDHash()`, `computeColorHistogram()`
  - [x] 移入 `hammingDistance()`, `histogramSimilarity()`
  - [x] 纯算法 + sharp I/O，可独立测试
- [x] 3.2 新建 `services/similarity/clustering.ts`
  - [x] 移入 `UnionFind` class
  - [x] 移入 `buildGroups()`, `isSimilar()`
  - [x] 新增 `SimilarGroupRaw` 类型（不含审阅状态，与 DB 解耦）
- [x] 3.3 `services/similarity/index.ts` 保留编排逻辑
  - [x] `analyzeFolder()` — 调用 hash + clustering 模块
  - [x] `getSimilarGroups()` — 聚类 + 补充审阅状态
  - [x] `getSimilarStats()` — 复用已加载哈希，避免二次 loadHashesForPhotos
- [x] 3.4 修复 N+1 查询: `loadHashesForPhotos` 改为 `WHERE file_path IN (...)` + SQL 别名对齐 camelCase
- [x] 3.5 修复 `getSimilarStats`: 复用 photoHashMap.size 作为 analyzed 计数，不再单独 COUNT
- [x] 3.6 Code review 修复:
  - [x] SQL IN 分批（SQLITE_IN_CHUNK=900），防超大文件夹溢出
  - [x] colorHist backfill: 预 prepare UPDATE 语句 + 新对象替代就地突变 + 错误日志
  - [x] enrichGroupsWithStatus 调用链分批: getReviewStatuses + getPhotoMetaBatch 均加 SQLITE_IN_CHUNK
  - [x] SSE 心跳: 移除背压永久停止逻辑，改为跳过本次等待下次重试
  - [x] SSE abort: 移除冗余 aborted 布尔量，统一使用 controller.signal.aborted
  - [x] buildGroups abort 检查: 断连时跳过 O(n²) 聚类
  - [x] getSimilarStats 接受可选参数，与 getSimilarGroups 保持一致
  - [x] /groups 和 /stats 路由: 修复 falsy-zero `|| undefined` → 显式 undefined 检查
  - [x] restorePhotos: 失败项 continue 跳过（不 return []），避免部分恢复泄漏
  - [x] computeDHash: 移除动态 `import('fs')`，用 sharp metadata.size 替代 fs.stat
  - [x] agent-index.md: 更新任务路由表和数据模型位置
- [x] 3.7 验证: `npm run build` 通过，类型检查无错误

**关键文件**:
- `server/src/services/similarity/hash.ts` (新建)
- `server/src/services/similarity/clustering.ts` (新建)
- `server/src/services/similarity/index.ts` (原 similarity.ts 重构)

---

### Phase 4: SSE 加固 + 请求日志 [P1]
**状态**: done
**预计**: 0.5 天

**任务**:
- [x] 4.1 `routes/similarity.ts` SSE 加固
  - [x] `req.on('close', ...)` 检测客户端断连
  - [x] `analyzeFolder` 接收 `AbortSignal`，断连时提前退出
  - [x] 添加 15s 心跳 (`:keepalive\n\n`)
  - [x] 心跳背压处理: 跳过本次等待下次重试（不永久停止）
  - [x] 统一使用 `controller.signal.aborted`，移除冗余布尔量
- [x] 4.2 新建 `middleware/requestLogger.ts`
  - [x] 记录 method, path, status, duration
  - [x] 可选: 添加请求 ID (x-request-id)
- [x] 4.3 在 `index.ts` 中注册日志中间件
- [x] 4.4 验证: `npm run build` 通过

**关键文件**:
- `server/src/routes/similarity.ts`
- `server/src/middleware/requestLogger.ts` (新建)
- `server/src/index.ts`

---

### Phase 5: OS 逻辑迁移 + 缓存统一 [P2]
**状态**: not_started
**预计**: 0.5 天

**任务**:
- [ ] 5.1 将 `routes/folders.ts` 中 `getWindowsDrives()`, `getMacVolumes()` 提取到 `services/drives.ts`
- [ ] 5.2 统一缓存模式
  - [ ] 评估引入 `lru-cache` 包替代手写 Map
  - [ ] 或统一封装 `createLRUCache<T>(maxSize)` 工厂函数
  - [ ] 考虑添加 TTL 支持
- [ ] 5.3 修复 `exif.ts` 中 `statSync` → `fs.promises.stat`
- [ ] 5.4 修复 `trash.ts` 中同步文件操作 → async（至少批量路径）
- [ ] 5.5 修复 `cleanupPort.ts` 的 `findstr` 正则精度 + busy-wait → setTimeout

**关键文件**:
- `server/src/services/drives.ts` (新建)
- `server/src/routes/folders.ts`
- `server/src/cache/exifCache.ts`
- `server/src/cache/thumbnailCache.ts`

---

## 前端计划

### Phase 6: 统一照片数据源 [P0]
**状态**: not_started
**预计**: 2 天

**目标**: photos 数组从 4 个副本收敛为 AppContext 单一数据源 + selector hooks

**任务**:
- [ ] 6.1 重构 AppContext.tsx
  - [ ] 保持 `photos` 为唯一数据源
  - [ ] 提取 undo 逻辑: 将 100 行 `undoLastAction` switch 移入 `hooks/useUndoEngine.ts`（纯逻辑，不含 UI）
  - [ ] AppContext 只暴露 `photos`, `updatePhoto(id, patch)`, `loadPhotos()`
- [ ] 6.2 新建 selector hooks
  - [ ] `hooks/useReviewPhotos.ts` — 从 AppContext.photos 派生审阅页需要的数据（filtered, sorted, currentIndex）
  - [ ] `hooks/useSimilarPhotos.ts` — 从 AppContext.photos 派生相似页需要的数据
  - [ ] `hooks/useRandomPhotos.ts` — 从 AppContext.photos 派生随机批次数据
- [ ] 6.3 重构 ReviewContext.tsx
  - [ ] 删除本地 `photos` 状态，改用 `useReviewPhotos()`
  - [ ] 只保留 UI 状态: currentIndex, selectedDate, statusFilter, subfolderFilter, panel 开关
  - [ ] 删除 `photo:restored` 事件监听（不再需要手动同步）
  - [ ] 修复空 catch（refresh 中的 silent error）
- [ ] 6.4 重构 SimilarContext.tsx
  - [ ] 删除本地 `groups` 中的冗余 photos 副本（改为引用 AppContext.photos 中的对象）
  - [ ] 分离 UI 状态（lightbox, focusedIndex）到独立 hook
  - [ ] 修复 `directDelete` 中的 photo restore 归属 bug（当前总是加到 group[0]）
- [ ] 6.5 重构 useRandomBatch.ts
  - [ ] 删除本地 `photos` 状态
  - [ ] 改用 `useRandomPhotos()` selector
  - [ ] 保留 UI 状态: currentIndex, batchSize, loading, error
- [ ] 6.6 删除 `context/RandomNavContext.tsx`（0 consumers，死代码）
- [ ] 6.7 删除 `photo:restored` 事件机制（不再需要跨 context 同步）
- [ ] 6.8 验证: 所有页面的照片操作（审阅、评分、收藏、删除、恢复）正常

**关键文件**:
- `client/src/context/AppContext.tsx` (重构)
- `client/src/context/ReviewContext.tsx` (大幅瘦身)
- `client/src/context/SimilarContext.tsx` (大幅瘦身)
- `client/src/hooks/useRandomBatch.ts` (瘦身)
- `client/src/hooks/useReviewPhotos.ts` (新建)
- `client/src/hooks/useUndoEngine.ts` (新建)
- `client/src/context/RandomNavContext.tsx` (删除)

---

### Phase 7: 共享组件提取 + 页面拆分 [P1]
**状态**: not_started
**预计**: 1 天

**任务**:
- [ ] 7.1 提取 `components/shared/PhotoActionBar.tsx`
  - [ ] 合并 ReviewControls.tsx 和 RandomControls.tsx 的公共逻辑
  - [ ] Props: canGoPrev, canGoNext, rating, favorite, onPrev, onNext, onKeep, onDelete, onRating, onFavorite
  - [ ] ReviewControls 和 RandomControls 改为使用 PhotoActionBar + 各自的额外按钮
- [ ] 7.2 提取 `components/ui/LoadingScreen.tsx`
  - [ ] 替代 GridPage, ReviewPage, SimilarPage 中的内联 spinner
- [ ] 7.3 拆分 RandomPage.tsx (244行)
  - [ ] `components/random/StartView.tsx` — 开始审阅界面
  - [ ] `components/random/BatchViewer.tsx` — 批次浏览界面
  - [ ] `components/random/BatchCompleteView.tsx` — 批次完成界面
- [ ] 7.4 修复 `useExif` 依赖: `photo` → `photo?.id`
- [ ] 7.5 修复 `useKeyboardShortcuts` — 内部用 useRef 存储 callback map，调用方不再需要 useMemo
- [ ] 7.6 添加 React ErrorBoundary (`components/ui/ErrorBoundary.tsx`)
  - [ ] 包裹 App.tsx 路由
  - [ ] 降级 UI: 错误信息 + 返回首页按钮
- [ ] 7.7 验证: 所有页面渲染正常，ErrorBoundary 可捕获渲染错误

**关键文件**:
- `client/src/components/shared/PhotoActionBar.tsx` (新建)
- `client/src/components/ui/LoadingScreen.tsx` (新建)
- `client/src/components/ui/ErrorBoundary.tsx` (新建)
- `client/src/components/random/StartView.tsx` (新建)
- `client/src/components/random/BatchViewer.tsx` (新建)
- `client/src/components/random/BatchCompleteView.tsx` (新建)
- `client/src/hooks/useExif.ts`
- `client/src/hooks/useKeyboardShortcuts.ts`

---

### Phase 8: 错误处理修复 [P1]
**状态**: not_started
**预计**: 0.5 天

**任务**:
- [ ] 8.1 修复 `api/index.ts` 重试逻辑
  - [ ] 只对网络错误 (fetch throws) 重试
  - [ ] 4xx 响应不重试（客户端错误重试无意义）
  - [ ] 仅 5xx 或网络错误重试
- [ ] 8.2 修复 ReviewContext.refresh() 的空 catch
  - [ ] 设置 error 状态
  - [ ] 显示 toast 通知
- [ ] 8.3 修复 SSE 错误处理 (`analyzeSimilarStream`)
  - [ ] 使用 try/catch 包裹 SSE 连接
  - [ ] 错误通过 onError callback 传递
- [ ] 8.4 统一 API 错误响应格式
  - [ ] 与后端协商统一为 `{ error: { code: string, message: string } }`
- [ ] 8.5 验证: 网络断开时显示友好错误，不静默失败

**关键文件**:
- `client/src/api/index.ts`
- `client/src/context/ReviewContext.tsx`

---

### Phase 9: 配置管理 [P2]
**状态**: not_started
**预计**: 0.5 天

**任务**:
- [ ] 9.1 添加 `.env` 文件支持
  - [ ] 服务端: `dotenv` 或直接 `process.env`
  - [ ] 客户端: Vite 内置 `import.meta.env`
- [ ] 9.2 统一端口配置
  - [ ] `BACKEND_PORT=3001` → server/index.ts
  - [ ] `FRONTEND_PORT=5173` → client/vite.config.ts
  - [ ] `CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173` → server/index.ts
- [ ] 9.3 提取 `server/src/config.ts` 集中管理常量
  - [ ] MAX_FOLDERS, THUMBNAIL_SIZE, MAX_MEMORY_CACHE, MAX_DISK_CACHE_MB, DEFAULT_PAGE_LIMIT
- [ ] 9.4 验证: 修改 .env 后服务启动使用新配置

**关键文件**:
- `.env` (新建)
- `.env.example` (新建)
- `server/src/config.ts` (新建)
- `client/vite.config.ts`
- `server/src/index.ts`

---

## 错误记录

| 错误 | 尝试 | 解决方案 |
|------|------|---------|
| (暂无) | | |

---

## 决策记录

| 决策 | 理由 | 日期 |
|------|------|------|
| Phase 1 (类型+Scanner) 最先执行 | 所有后续工作都依赖清晰的类型定义和合理的模块边界 | 2026-06-16 |
| 前端后端计划可并行 | 两条线的变更文件几乎不重叠 | 2026-06-16 |
| Repository 层作为 P1 而非 P0 | 当前直接 SQL 虽然不理想，但工作量可控，可在 Phase 2/3 重构时顺便引入 | 2026-06-16 |
