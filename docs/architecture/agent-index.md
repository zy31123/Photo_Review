# Agent 路由索引

> AI 助手阅读源码前先看此文件，按任务类型定位相关文件。

## 服务端

### 文件扫描与配对
- `server/src/services/scanner.ts` — `scanFolder()`, `getPhotoById()`, `getPhotosForFolder()`
  - `PhotoGroup` 接口, `JPG_EXTS` (.jpg/.jpeg), `RAW_EXTS` (.cr2/.cr3/.nef)
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
- `server/src/services/review.ts` — `recordReview()`, `getRandomUnreviewedPhoto()`, `getCacheDays()`, `setCacheDays()`, `getStats()`
  - review_records 表, cache_until 随机缓存, settings 表

### 数据库
- `server/src/db/index.ts` — `getDb()`
  - SQLite WAL 模式, review_records + settings 两张表

### 路径工具
- `server/src/utils/path.ts` — `normalizePath()`, `resolveNormalized()`

### API 路由 (14 端点)
- `server/src/routes/index.ts` — 所有 REST 端点定义
  - 路径白名单 `isPathAllowed()`, `BLOCKED_PREFIXES`
  - Windows 盘符探测 `getWindowsDrives()`, Mac 卷探测 `getMacVolumes()`

### Express 入口
- `server/src/index.ts` — 应用启动, CORS, 路由挂载, 127.0.0.1:3001

## 客户端

### 首页 (文件夹选择)
- `client/src/pages/HomePage.tsx` — 路径输入, 扫描触发
- `client/src/components/FolderPicker.tsx` — 文件夹浏览器模态框

### 审阅页 (核心页面)
- `client/src/pages/ReviewPage.tsx` — ReviewProvider 包裹, 三栏布局
- `client/src/context/ReviewContext.tsx` — `useReview()` 全部状态和操作
- `client/src/hooks/useDateGroups.ts` — 月份/日期分组计算
- `client/src/hooks/useKeyboardShortcuts.ts` — 全局快捷键 (Arrow/D/Space/[/])
- `client/src/components/review/DateSidebar.tsx` — 左侧日期导航
- `client/src/components/review/ImageViewport.tsx` — 中央图片视口 + 滚轮翻页
- `client/src/components/review/ReviewControls.tsx` — 底部悬浮操作按钮
- `client/src/components/review/ReviewToolbar.tsx` — 顶部工具栏 (文件名/计数/侧栏开关)
- `client/src/components/review/DetailsPanel.tsx` — 右侧 EXIF + 文件信息面板
- `client/src/components/review/Filmstrip.tsx` — 底部胶片条 (窗口化 150+150)

### 批量处理页
- `client/src/pages/BatchPage.tsx` — 孤立文件列表 + 批量删除

### 随机审阅页
- `client/src/pages/RandomPage.tsx` — 单张随机展示 + 内联快捷键

### 通用组件
- `client/src/components/ui/SectionHeader.tsx` — 分区标题

### API 客户端层
- `client/src/api/index.ts` — `api` 对象 (所有后端调用), 类型定义 (PhotoGroup, ExifData, Stats, BrowseResult, ScanResult)
  - GET 自动重试 (3 次), activeFolder 模块级状态

### 路由
- `client/src/App.tsx` — 4 条路由: `/` `/review` `/batch` `/random`

### 样式
- `client/src/styles/index.css` — Tailwind 4 @theme 自定义 (Darkroom 配色), 全局样式
- `client/vite.config.ts` — Vite 配置, /api 代理到 3001

## 按任务类型

| 任务 | 先读 | 再读 |
|------|------|------|
| 修改扫描逻辑 | scanner.ts | routes/index.ts, api/index.ts |
| 添加图片格式 | scanner.ts (JPG_EXTS/RAW_EXTS) | image.ts, exif.ts |
| 修改审阅流程 | ReviewContext.tsx | ReviewPage.tsx, ReviewControls.tsx, review.ts |
| 修改 API 端点 | routes/index.ts | 对应 service 文件, api/index.ts |
| 修改 UI 样式 | index.css | 对应组件 |
| 修改快捷键 | useKeyboardShortcuts.ts | ReviewPage.tsx |
| 修改数据库表 | db/index.ts | review.ts |
| 添加新页面 | App.tsx | 参考现有页面, api/index.ts |
| 修改文件夹浏览 | FolderPicker.tsx | routes/index.ts (browse) |
| 安全相关 | routes/index.ts (isPathAllowed) | server/src/index.ts (127.0.0.1 绑定) |
