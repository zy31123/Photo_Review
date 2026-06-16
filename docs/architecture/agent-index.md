# Agent 路由索引

> ⚠️ 收到任何涉及代码的任务时，**必须先查下表定位文件**，禁止用 Glob/Grep 全局搜索来发现文件结构。

## 任务路由表

| 任务 | 先读 | 再读 | 说明 |
|------|------|------|------|
| 修改扫描逻辑 | scanner.ts | routes/folders.ts, api/index.ts | 扫描配对在 scanner，端点在 folders，客户端在 api |
| 添加图片格式 | scanner.ts (JPG_EXTS/RAW_EXTS) | image.ts, exif.ts | 格式定义在 scanner，处理在 image/exif |
| 修改审阅流程 | ReviewContext.tsx | ReviewPage.tsx, ReviewControls.tsx, NavBar.tsx, review.ts | 前端状态在 Context，后端逻辑在 review.ts |
| 修改网格浏览 | GridContext.tsx | GridPage.tsx, FolderSidebar.tsx, YearTimeline.tsx, Lightbox.tsx | 前端状态在 Context，四个子组件 |
| 修改随机浏览 | useRandomBatch.ts | RandomPage.tsx, RandomToolbar.tsx, RandomControls.tsx, review.ts | hook 管理批次状态，后端用 review.ts |
| 修改相似聚类 | SimilarContext.tsx | SimilarPage.tsx, similarity/index.ts, similarity/clustering.ts, ClusterCard.tsx | 前端状态在 Context，后端编排在 similarity/index.ts，纯算法在 similarity/hash.ts + clustering.ts |
| 修改 API 端点 | routes/对应文件.ts | 对应 service 文件, api/index.ts | 端点分布在 6 个路由文件，客户端封装在 api |
| 修改 UI 样式 | index.css | 对应组件 | Tailwind 4 @theme 配色在 index.css |
| 修改快捷键 | useKeyboardShortcuts.ts | ReviewPage.tsx | 快捷键定义在 hook，绑定在 ReviewPage |
| 修改数据库表 | db/index.ts | review.ts, similarity/index.ts | 建表在 db，消费方在两个 service |
| 添加新页面 | App.tsx | 参考现有页面, api/index.ts | 路由注册在 App，参考最接近的现有页面 |
| 修改文件夹浏览 | FolderPicker.tsx | routes/folders.ts (browse), services/drives.ts | 前端模态框 + 后端浏览端点 + OS 盘符探测 |
| 修改子文件夹 | scanner.ts (getSubfolders) | GridContext.tsx, FolderSidebar.tsx, routes/folders.ts | 扫描器提供数据，网格页消费 |
| 修改全局导航 | NavBar.tsx | App.tsx | 导航栏组件 + 路由定义 |
| 修改通用 UI | ui/ActionBtn.tsx | ui/Tooltip.tsx, ui/Badge.tsx, ui/SegmentedControl.tsx | ui/ 下所有共享组件 |
| 安全相关 | utils/security.ts (isPathAllowed) | server/src/index.ts (127.0.0.1 绑定) | 路径白名单 + 网络绑定 |
| 修改 e2e 测试 | playwright.config.ts | e2e/helpers.ts, 对应 spec 文件 | Playwright 配置在根目录，辅助函数在 helpers，每页面一个 spec |
| 修改根级状态 | AppContext.tsx | api/index.ts, HomePage.tsx | 根 Context + API 层 + 首页初始化 |

## 文件索引

### 服务端 (`server/src/`)

- `services/drives.ts` — OS 磁盘/卷探测 (Windows 盘符 + Mac 卷) + 30s TTL 缓存
- `services/scanner.ts` — 异步文件扫描 (fs.promises) + JPG/RAW 配对 + MD5 ID + 子文件夹 + 孤立文件检测
- `services/photoStore.ts` — 内存照片存储 (photoStore Map, photoIndex Map, getPhotoById, getPhotosForFolder, addPhoto, removePhoto)
- `services/photoQuery.ts` — 照片查询: 合并审阅状态/meta + 按状态/子文件夹过滤 + 分页
- `services/photoLifecycle.ts` — 删除/恢复事务操作: deletePhotoToTrash (移入回收站+记录撤销) + restorePhoto/restorePhotos (文件还原+DB清理)
- `services/image.ts` — 缩略图 (委托 thumbnailCache) + 全图 (RAW 转 JPEG / JPG 流式)
- `services/exif.ts` — EXIF 提取 (exifr, 仅读前 256KB) + 内存缓存
- `services/review.ts` — 审阅记录 + 随机选取 (Fisher-Yates) + 缓存 + 统计
- `services/similarity/index.ts` — 相似分析编排层（DB 持久化 + p-limit 并行 + 对外暴露 analyzeFolder/getSimilarGroups/getSimilarStats）
- `services/similarity/hash.ts` — 纯算法：dHash 感知哈希、颜色直方图、汉明距离、直方图相似度（零副作用，可独立测试）
- `services/similarity/clustering.ts` — Union-Find 聚类 + 时间预分组 + isSimilar 双阈值判定 + buildGroups
- `services/deleter.ts` — 删除到回收站 (trash)
- `middleware/errorHandler.ts` — AppError 类 (NotFound/Forbidden/ValidationError) + 全局错误中间件 (统一 `{ error: { code, message } }` 格式)
- `middleware/asyncHandler.ts` — async 路由 handler 包装 (自动 catch → errorHandler)
- `middleware/validate.ts` — zod schema 校验中间件 (query/body/params)
- `middleware/loadPhoto.ts` — param(:id) → getPhotoById + 404 + req.photo 注入
- `routes/index.ts` — 路由注册入口 (挂载 6 个子路由)
- `routes/folders.ts` — 文件夹浏览 + 扫描 + 子文件夹 (3 端点)
- `routes/photos.ts` — 照片列表 + 缩略图 + 全图 + EXIF + 删除/恢复 (业务逻辑在 photoQuery/photoLifecycle)
- `routes/reviews.ts` — 审阅提交 + 随机照片 + 随机批次 (3 端点)
- `routes/similarity.ts` — 相似分析 SSE + 分组 + 统计 (3 端点)
- `routes/settings.ts` — 设置读写 (2 端点)
- `routes/batch.ts` — 批量孤立文件操作 (2 端点)
- `cache/lruCache.ts` — 泛型 LRU 缓存工厂 createLRUCache<T>(maxSize)
- `cache/thumbnailCache.ts` — 内存 LRU (500) + 磁盘双层缩略图缓存 (sharp)
- `cache/exifCache.ts` — EXIF 结果内存 LRU 缓存 (200)
- `db/index.ts` — SQLite WAL + 版本迁移机制
- `db/migrations.ts` — 迁移定义数组 (version + SQL)
- `utils/path.ts` — normalizePath(), resolveNormalized()
- `utils/security.ts` — isPathAllowed() 路径白名单检查
- `utils/cleanupPort.ts` — killPortOccupant() 异步端口清理（精确端口匹配 + setTimeout 轮询）
- `config.ts` — 集中配置: PORT, CORS_ORIGINS, THUMBNAIL_SIZE, MAX_MEMORY_CACHE, MAX_DISK_CACHE_MB, MAX_FOLDERS, DEFAULT_PAGE_LIMIT, SQLITE_IN_CHUNK
- `index.ts` — Express 入口, CORS, errorHandler, 127.0.0.1:PORT

### 客户端 (`client/src/`)

**页面 (`pages/`):**
- `HomePage.tsx` — 文件夹选择 + 扫描触发 + 跳转 /grid
- `GridPage.tsx` — 虚拟化网格 + Lightbox + 文件夹/日期导航
- `ReviewPage.tsx` — 三栏审阅布局（核心页面）
- `RandomPage.tsx` — 批次随机 + 详情面板 (拆分为 StartView/BatchViewer/BatchCompleteView)
- `SimilarPage.tsx` — 相似聚类分析流程

**Context (`context/`):**
- `AppContext.tsx` — 根级单一数据源 (activeFolder, photos, settings, loadPhotos, updatePhotoRating/Favorite)
- `GridContext.tsx` — 网格页状态 (dateSections, virtualItems, subfolder 过滤)
- `ReviewContext.tsx` — 审阅页 UI 状态 (currentIndex/筛选/面板; photos 从 AppContext 派生)
- `SimilarContext.tsx` — 相似页状态 (分析/聚类/选择/删除; groups 刷新通过 appPhotos 长度变化触发)

**Hooks (`hooks/`):**
- `useUndoEngine.ts` — 撤销引擎 (rating/favorite/review/delete/delete_batch 统一处理)
- `useReviewPhotos.ts` — selector: 从 AppContext.photos 派生审阅页过滤/分组数据
- `useDateGroups.ts` — 月→日分组 (支持状态和子文件夹筛选)
- `useKeyboardShortcuts.ts` — Arrow/D/Space/[/] 快捷键 (内部 useRef, 调用方无需 useMemo)
- `useRandomBatch.ts` — 随机批次管理 (加载/导航/操作)
- `useExif.ts` — 单张 EXIF 懒加载 (依赖 photo.id 而非 photo 引用)
- `useDragImage.ts` — 拖拽图片导出
- `useImageZoom.ts` — 缩放平移 (Ctrl+滚轮/拖拽/双击)
- `useStaggeredReveal.ts` — IntersectionObserver 交错渐入动画

**组件 (`components/`):**
- `NavBar.tsx` — 全局导航栏
- `FolderPicker.tsx` — 文件夹浏览器模态框
- `grid/FolderSidebar.tsx` — 子文件夹树
- `grid/Lightbox.tsx` — 全屏图片浮层
- `grid/YearTimeline.tsx` — 日期时间线
- `review/DateSidebar.tsx` — 日期导航
- `review/ImageViewport.tsx` — 图片视口 + 滚轮翻页
- `review/ReviewControls.tsx` — 审阅操作按钮 (基于 PhotoActionBar)
- `review/DetailsPanel.tsx` — EXIF 详情面板
- `review/PhotoDetailsView.tsx` — 纯展示照片详情 (可复用)
- `review/Filmstrip.tsx` — 胶片条 (窗口化 150+150)
- `random/RandomControls.tsx` — 随机模式操作按钮 (基于 PhotoActionBar)
- `random/RandomToolbar.tsx` — 随机模式工具栏
- `random/BatchSelector.tsx` — 批次大小选择器
- `random/StartView.tsx` — 随机模式开始界面
- `random/BatchViewer.tsx` — 随机模式照片浏览 (含 zoom/drag)
- `random/BatchCompleteView.tsx` — 随机模式批次完成界面
- `similar/SimilarToolbar.tsx` — 分析/统计/批量删除
- `similar/ClusterCard.tsx` — 相似组卡片
- `similar/ClusterGrid.tsx` — 卡片网格
- `shared/PhotoActionBar.tsx` — 照片操作栏基组件 (导航/评分/收藏/保留/删除)
- `shared/DateSidebarBase.tsx` — 日期侧栏基组件
- `shared/useCollapsedMonths.ts` — 月折叠状态
- `ui/ActionBtn.tsx` — 圆形操作按钮
- `ui/Badge.tsx` — 状态标签
- `ui/EmptyState.tsx` — 空状态占位
- `ui/ErrorBoundary.tsx` — React 错误边界 (降级 UI + 返回首页)
- `ui/LoadingScreen.tsx` — 全屏加载状态
- `ui/LoadingSpinner.tsx` — 加载旋转器
- `ui/SectionHeader.tsx` — 分区标题
- `ui/SegmentedControl.tsx` — 分段选择器
- `ui/ToolbarDivider.tsx` — 垂直分隔线
- `ui/Tooltip.tsx` — 悬浮提示

**其他:**
- `api/index.ts` — 所有后端调用封装 + 类型定义 + 智能重试 (仅 5xx/网络错误)
- `App.tsx` — 5 条路由 + ErrorBoundary 包裹
- `styles/index.css` — Tailwind 4 @theme Darkroom 配色
- `utils/date.ts` — formatChineseDate()

### 测试 (`e2e/`)

- `helpers.ts` — 共享工具: `scanFromHome` (注入 localStorage → 点击扫描 → 到达 /grid)、`waitForPhotos` (三重等待: DOM + complete + networkidle)、`waitForFullImage` (大图加载)、`navigateViaNavBar` (客户端导航，避免丢失 Context)、`TEST_FOLDER` (`E:\Photos`)
- `home.spec.ts` — 首页空状态 + 最近文件夹列表 + 扫描跳转
- `grid.spec.ts` — 网格缩略图 + Lightbox 大图
- `review.spec.ts` — 审阅页默认状态 + 接受操作
- `random.spec.ts` — 随机浏览 + 开始审阅
- `similar.spec.ts` — 相似分析空闲 + 触发分析结果

### 测试配置

- `playwright.config.ts` — Chromium only, viewport 1440×900, screenshot: on, outputDir: `e2e/screenshots/`, webServer 通过 `npm run dev` 自动启动

## 数据模型位置

需要查看接口定义时，直接读对应源文件即可：
- `PhotoGroup` → `server/src/services/scanner.ts`
- `ExifData` → `server/src/services/exif.ts`
- `SubfolderInfo` → `server/src/services/scanner.ts`
- `ReviewStatus` → `server/src/services/review.ts`
- `SimilarGroup` → `packages/shared/src/types.ts`（DTO）/ `server/src/services/similarity/clustering.ts`（SimilarGroupRaw 内部类型）
- 数据库表结构 → `server/src/db/index.ts`
