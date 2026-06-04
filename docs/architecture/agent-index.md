# Agent 路由索引

> AI 助手阅读源码前先看此文件，按任务类型定位相关文件。

## 服务端

### 文件扫描与配对
- `server/src/services/scanner.ts` — `scanFolder()`, `getPhotoById()`, `getPhotosForFolder()`, `getSubfolders()`, `removePhoto()`
  - `PhotoGroup` 接口, `SubfolderInfo` 接口 `{ name, path, count }`
  - `JPG_EXTS` (.jpg/.jpeg), `RAW_EXTS` (.cr2/.cr3/.nef)
  - MD5 ID 生成, 孤立文件检测, 内存存储 (最多 10 个文件夹)

### 图片处理
- `server/src/services/image.ts` — `getThumbnail()`, `getFullImage()`, `getImageMimeType()`
  - LRU 缓存 (最多 500 条), sharp 缩略图 (200px, JPEG quality 70)
  - RAW 转 JPEG, 流式输出 JPG

### EXIF 解析
- `server/src/services/exif.ts` — `extractExif()`
  - `ExifData` 接口 (camera, lens, focalLength, aperture, shutterSpeed, iso, width, height, dateTime, fileSize)
  - 使用 exifr 库, 自动合并 JPG+RAW 文件大小

### 删除操作
- `server/src/services/deleter.ts` — `deletePhoto()`, `deleteOrphanedFiles()`
  - 使用 trash 库 (移至回收站), 批量删除

### 审阅记录
- `server/src/services/review.ts` — `recordReview()`, `getRandomUnreviewedPhoto()`, `getRandomUnreviewedPhotos()`, `getReviewStatuses()`, `getCacheDays()`, `setCacheDays()`, `getStats()`
  - review_records 表, cache_until 随机缓存, settings 表
  - `ReviewStatus` 接口 `{ action, reviewedAt }`
  - `getCandidates()` 私有辅助函数提取未缓存候选, Fisher-Yates 部分洗牌

### 相似图片聚类
- `server/src/services/similarity.ts` — `analyzeFolder()`, `getSimilarGroups()`, `getSimilarStats()`
  - dHash 感知哈希 (64-bit, sharp 9×8 灰度), Hamming 距离比较
  - 两阶段聚类: 时间预分组 (30s) + Union-Find 哈希聚类
  - photo_hashes 表持久化, 增量计算 (跳过已有哈希)
  - `SimilarGroup` 接口 (id, photos, coverIndex, avgDistance)

### 数据库
- `server/src/db/index.ts` — `getDb()`
  - SQLite WAL 模式, review_records + settings + photo_hashes 三张表

### 路径工具
- `server/src/utils/path.ts` — `normalizePath()`, `resolveNormalized()`

### API 路由 (18 端点)
- `server/src/routes/index.ts` — 所有 REST 端点定义
  - 路径白名单 `isPathAllowed()`, `BLOCKED_PREFIXES`
  - Windows 盘符探测 `getWindowsDrives()`, Mac 卷探测 `getMacVolumes()`
  - 相似度端点: POST `/similarity/analyze`, GET `/similarity/groups`, GET `/similarity/stats`

### Express 入口
- `server/src/index.ts` — 应用启动, CORS, 路由挂载, 127.0.0.1:3001

## 客户端

### 首页 (文件夹选择)
- `client/src/pages/HomePage.tsx` — 路径输入, 扫描触发, 扫描后跳转 /grid
- `client/src/components/FolderPicker.tsx` — 文件夹浏览器模态框

### 网格浏览页
- `client/src/pages/GridPage.tsx` — GridProvider 包裹, 虚拟化网格 (@tanstack/react-virtual)
- `client/src/context/GridContext.tsx` — `useGrid()` 网格状态 (dateSections, virtualItems, subfolder 过滤, 列数)
- `client/src/components/grid/FolderSidebar.tsx` — 左侧子文件夹树
- `client/src/components/grid/Lightbox.tsx` — 全屏图片查看浮层
- `client/src/components/grid/YearTimeline.tsx` — 右侧垂直日期时间线

### 审阅页 (核心页面)
- `client/src/pages/ReviewPage.tsx` — ReviewProvider 包裹, 三栏布局
- `client/src/context/ReviewContext.tsx` — `useReview()` 全部状态和操作 (含 statusFilter, subfolderFilter, reviewedCount)
- `client/src/hooks/useDateGroups.ts` — 月份/日期分组计算 (支持状态和子文件夹筛选)
- `client/src/hooks/useKeyboardShortcuts.ts` — 全局快捷键 (Arrow/D/Space/[/])
- `client/src/components/review/DateSidebar.tsx` — 左侧日期导航
- `client/src/components/review/ImageViewport.tsx` — 中央图片视口 + 滚轮翻页
- `client/src/components/review/ReviewControls.tsx` — 底部悬浮操作按钮
- `client/src/components/review/DetailsPanel.tsx` — 右侧 EXIF + 文件信息面板 (ReviewContext wrapper)
- `client/src/components/review/PhotoDetailsView.tsx` — 纯展示照片详情组件 (props 驱动, 可复用)
- `client/src/components/review/Filmstrip.tsx` — 底部胶片条 (窗口化 150+150)

### 随机浏览页
- `client/src/pages/RandomPage.tsx` — 批次随机浏览 + 详情面板
- `client/src/hooks/useRandomBatch.ts` — 随机批次状态管理 (批次加载/导航/操作)
- `client/src/components/random/RandomToolbar.tsx` — 随机模式顶部工具栏
- `client/src/components/random/RandomControls.tsx` — 随机模式浮动操作按钮
- `client/src/components/random/BatchSelector.tsx` — 批次大小选择器

### 相似聚类页
- `client/src/pages/SimilarPage.tsx` — SimilarProvider 包裹, 分析 → 聚类 → 删除流程
- `client/src/context/SimilarContext.tsx` — `useSimilar()` 状态管理 (分析/分组/选择/删除)
- `client/src/components/similar/SimilarToolbar.tsx` — 工具栏 (分析按钮/统计/批量删除)
- `client/src/components/similar/ClusterCard.tsx` — 相似组卡片 (缩略图 + 保留/删除选择)
- `client/src/components/similar/ClusterGrid.tsx` — 卡片网格布局

### 全局导航
- `client/src/components/NavBar.tsx` — 全局导航栏 (tab 风格路由切换 Grid/Review/Random/Similar, 内含 GridControls, ReviewControls)

### 共享组件
- `client/src/components/shared/DateSidebarBase.tsx` — 日期侧栏共享基组件 (月折叠)
- `client/src/components/shared/useCollapsedMonths.ts` — 月折叠状态 hook

### 通用 UI 组件
- `client/src/components/ui/ActionBtn.tsx` — 可复用圆形操作按钮
- `client/src/components/ui/LoadingSpinner.tsx` — 带脉冲动画加载旋转器
- `client/src/components/ui/ToolbarDivider.tsx` — 垂直分隔线

### 通用组件
- `client/src/components/ui/SectionHeader.tsx` — 分区标题

### 新增 Hooks
- `client/src/hooks/useExif.ts` — 单张照片 EXIF 懒加载
- `client/src/hooks/useDragImage.ts` — 拖拽图片导出 (canvas→blob→File)
- `client/src/hooks/useImageZoom.ts` — 缩放与平移 (Ctrl+滚轮/拖拽/双击重置)

### 根级状态
- `client/src/context/AppContext.tsx` — `useApp()` 根级状态 (activeFolder, photos, settings, isLoaded, loadPhotos)

### API 客户端层
- `client/src/api/index.ts` — `api` 对象 (所有后端调用), 类型定义 (PhotoGroup, ExifData, Stats, BrowseResult, ScanResult, SimilarGroup, AnalyzeResult, SimilarStats)
  - GET 自动重试 (3 次), activeFolder 模块级状态
  - 方法: browseFolders, scanFolder, getSubfolders, getPhotos, deletePhoto, submitReview, getRandomPhoto, getRandomPhotos, getStats, getSettings, updateSettings, thumbnailUrl, fullUrl, getExif

### 工具函数
- `client/src/utils/date.ts` — `formatChineseDate()` 日期格式化

### 路由
- `client/src/App.tsx` — 5 条路由: `/` `/grid` `/review` `/random` `/similar`

### 样式
- `client/src/styles/index.css` — Tailwind 4 @theme 自定义 (Darkroom 配色), 全局样式
- `client/vite.config.ts` — Vite 配置, /api 代理到 3001

## 按任务类型

| 任务 | 先读 | 再读 |
|------|------|------|
| 修改扫描逻辑 | scanner.ts | routes/index.ts, api/index.ts |
| 添加图片格式 | scanner.ts (JPG_EXTS/RAW_EXTS) | image.ts, exif.ts |
| 修改审阅流程 | ReviewContext.tsx | ReviewPage.tsx, ReviewControls.tsx, NavBar.tsx, review.ts |
| 修改网格浏览 | GridContext.tsx | GridPage.tsx, FolderSidebar.tsx, YearTimeline.tsx, Lightbox.tsx |
| 修改随机浏览 | useRandomBatch.ts | RandomPage.tsx, RandomToolbar.tsx, RandomControls.tsx, review.ts |
| 修改相似聚类 | SimilarContext.tsx | SimilarPage.tsx, similarity.ts, ClusterCard.tsx |
| 修改 API 端点 | routes/index.ts | 对应 service 文件, api/index.ts |
| 修改 UI 样式 | index.css | 对应组件 |
| 修改快捷键 | useKeyboardShortcuts.ts | ReviewPage.tsx |
| 修改数据库表 | db/index.ts | review.ts, similarity.ts |
| 添加新页面 | App.tsx | 参考现有页面, api/index.ts |
| 修改文件夹浏览 | FolderPicker.tsx | routes/index.ts (browse) |
| 修改子文件夹 | scanner.ts (getSubfolders) | GridContext.tsx, FolderSidebar.tsx, routes/index.ts |
| 修改全局导航 | NavBar.tsx | App.tsx |
| 修改通用 UI | ui/ActionBtn.tsx | ui/LoadingSpinner.tsx, ui/ToolbarDivider.tsx |
| 安全相关 | routes/index.ts (isPathAllowed) | server/src/index.ts (127.0.0.1 绑定) |
| 修改根级状态 | AppContext.tsx | api/index.ts, HomePage.tsx |
