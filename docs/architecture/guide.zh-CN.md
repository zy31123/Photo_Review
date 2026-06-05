# Photo Review 架构说明

## 1. 项目概述

Photo Review 是一个本地照片审查工具，采用 Darkroom（暗房）视觉主题。
用户选择本地文件夹后，系统自动扫描 JPG/RAW 文件并配对，
支持网格浏览、逐张审阅、随机审阅。

架构：npm workspaces monorepo，`client/`（React 前端）和 `server/`（Express 后端）。
Vite 开发代理将 `/api` 转发至后端 3001 端口。

## 2. 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 前端框架 | React + TypeScript | React 19 |
| 路由 | react-router-dom | 7.x |
| 构建 | Vite | 6.x |
| 样式 | Tailwind CSS | 4.x (@tailwindcss/vite 插件) |
| 虚拟列表 | @tanstack/react-virtual | 3.x |
| 图标 | lucide-react | 1.x |
| 后端框架 | Express + TypeScript | Express 5 |
| CORS | cors | 2.x |
| 数据库 | better-sqlite3 | 11.x (WAL 模式) |
| 图片处理 | sharp | 0.33.x |
| EXIF 解析 | exifr | 7.x |
| 删除操作 | trash | 10.x (移至回收站) |
| 运行时 | Node.js | 22 |

## 3. 目录结构

```
Photo_Review/
├── package.json                    # monorepo 根，workspaces: ["client", "server"]
├── CLAUDE.md                       # Claude AI 配置
├── AGENTS.md                       # 指向 CLAUDE.md
├── client/
│   ├── index.html                  # HTML 入口
│   ├── vite.config.ts              # Vite 配置，React + Tailwind 插件，/api 代理
│   ├── package.json                # type: module
│   └── src/
│       ├── main.tsx                # 渲染入口：StrictMode + BrowserRouter
│       ├── App.tsx                 # 路由定义：/ /grid /review /random /similar，AppProvider 包裹
│       ├── api/index.ts            # API 客户端层，所有后端调用封装 (PhotoGroup, SubfolderInfo, ExifData, Stats, BrowseResult, ScanResult, SimilarGroup, AnalyzeResult, SimilarStats)
│       ├── context/
│       │   ├── AppContext.tsx       # 根级状态 (activeFolder, photos, settings, isLoaded, loadPhotos)
│       │   ├── GridContext.tsx      # 网格页状态 (dateSections, virtualItems, subfolder 过滤, 列数)
│       │   ├── ReviewContext.tsx    # 审阅页状态管理 (ReviewProvider + useReview)
│       │   ├── RandomNavContext.tsx # 随机页导航状态
│       │   └── SimilarContext.tsx   # 相似页状态管理 (SimilarProvider + useSimilar)
│       ├── hooks/
│       │   ├── useDateGroups.ts    # 日期分组计算 (月→日二级分组，支持状态和子文件夹筛选)
│       │   ├── useKeyboardShortcuts.ts # 全局快捷键
│       │   ├── useRandomBatch.ts   # 随机批次状态管理
│       │   ├── useExif.ts          # 单张照片 EXIF 懒加载
│       │   ├── useDragImage.ts     # 拖拽图片导出 (canvas→blob→File)
│       │   ├── useImageZoom.ts     # 缩放与平移 (Ctrl+滚轮/拖拽/双击重置)
│       │   └── useStaggeredReveal.ts # IntersectionObserver 交错渐入动画
│       ├── pages/
│       │   ├── HomePage.tsx        # 首页：文件夹选择 + 扫描触发
│       │   ├── GridPage.tsx        # 网格浏览：虚拟化照片网格 + Lightbox + 文件夹/日期导航
│       │   ├── ReviewPage.tsx      # 审阅页：三栏布局，核心页面
│       │   ├── RandomPage.tsx      # 随机浏览：批次随机 + 详情面板
│       │   └── SimilarPage.tsx     # 相似聚类：分析 → 聚类 → 删除流程
│       ├── components/
│       │   ├── FolderPicker.tsx    # 文件夹浏览器 (模态框)
│       │   ├── NavBar.tsx          # 全局导航栏 (tab 路由切换, GridControls, ReviewControls)
│       │   ├── grid/
│       │   │   ├── FolderSidebar.tsx   # 左侧子文件夹树
│       │   │   ├── Lightbox.tsx        # 全屏图片查看浮层
│       │   │   └── YearTimeline.tsx    # 右侧垂直日期时间线
│       │   ├── review/
│       │   │   ├── DateSidebar.tsx       # 左侧日期导航
│       │   │   ├── ImageViewport.tsx     # 中央图片视口
│       │   │   ├── ReviewControls.tsx    # 底部悬浮操作按钮
│       │   │   ├── DetailsPanel.tsx      # 右侧详情面板 (ReviewContext wrapper)
│       │   │   ├── PhotoDetailsView.tsx  # 纯展示照片详情组件 (可复用)
│       │   │   └── Filmstrip.tsx         # 底部胶片条
│       │   ├── random/
│       │   │   ├── BatchSelector.tsx     # 批次大小选择器
│       │   │   ├── RandomControls.tsx    # 随机模式浮动操作按钮
│       │   │   └── RandomToolbar.tsx     # 随机模式顶部工具栏
│       │   ├── similar/
│       │   │   ├── SimilarToolbar.tsx    # 工具栏 (分析按钮/统计/批量删除)
│       │   │   ├── ClusterCard.tsx       # 相似组卡片 (缩略图 + 保留/删除选择)
│       │   │   └── ClusterGrid.tsx       # 卡片网格布局
│       │   ├── shared/
│       │   │   ├── DateSidebarBase.tsx   # 日期侧栏共享基组件
│       │   │   └── useCollapsedMonths.ts # 月折叠状态 hook
│       │   └── ui/
│       │       ├── ActionBtn.tsx         # 可复用圆形操作按钮
│       │       ├── Badge.tsx             # 状态标签 (success/danger/neutral/info)
│       │       ├── EmptyState.tsx        # 空状态占位组件
│       │       ├── SectionHeader.tsx     # 通用分区标题
│       │       ├── SegmentedControl.tsx  # 分段选择器
│       │       ├── ToolbarDivider.tsx    # 垂直分隔线
│       │       └── Tooltip.tsx           # 悬浮提示 (支持快捷键显示)
│       ├── utils/
│       │   └── date.ts              # formatChineseDate() 日期格式化
│       └── styles/
│           └── index.css           # Tailwind 4 @theme (Darkroom 配色系统)
├── server/
│   ├── package.json                # type: module
│   └── src/
│       ├── index.ts                # Express 入口，CORS，端口 127.0.0.1:3001
│       ├── db/index.ts             # SQLite 连接 (WAL)，建表逻辑
│       ├── routes/index.ts         # 19 个 API 端点 + 路径安全白名单
│       ├── services/
│       │   ├── scanner.ts          # 文件扫描 + JPG/RAW 配对 + 子文件夹
│       │   ├── image.ts            # 缩略图生成 + LRU 缓存
│       │   ├── exif.ts             # EXIF 元数据提取
│       │   ├── review.ts           # 审阅记录 + 随机选取 + 批量状态 + 统计
│       │   ├── similarity.ts       # dHash 感知哈希 + Union-Find 聚类 (增量计算, photo_hashes 持久化)
│       │   └── deleter.ts          # 删除到回收站
│       └── utils/
│           └── path.ts             # 路径标准化工具
├── e2e/
│   ├── playwright.config.ts        # Playwright 配置
│   ├── fixtures/                   # 测试照片生成器
│   ├── helpers/                    # 测试辅助函数
│   ├── tests/                      # E2E 测试 + 可视化测试
│   ├── reports/                    # HTML 报告生成
│   └── screenshots/                # 截图输出
└── docs/
    └── architecture/
        ├── agent-index.md          # Agent 路由索引
        ├── guide.zh-CN.md          # 本文件
        └── guide.en.md             # 英文架构说明
```

## 4. 核心数据模型

### 4.1 PhotoGroup（照片组）

```typescript
interface PhotoGroup {
  id: string           // MD5(标准化路径)
  name: string         // 显示名称，格式 "basename.JPG" 或 "basename.CR2"
  jpgPath: string | null
  rawPaths: string[]   // 可能有多个 RAW 文件
  hasJpg: boolean
  hasRaw: boolean
  isOrphan: boolean    // hasJpg XOR hasRaw
  orphanType?: 'jpg' | 'raw'
  date?: string        // ISO 日期 "YYYY-MM-DD"，来自文件 mtime
  folder: string       // 标准化后的文件夹路径
  subfolder: string    // 相对于根文件夹的子文件夹路径
  // 以下字段仅客户端（通过 GET /photos 响应填充）
  reviewAction?: 'keep' | 'deleted' | null
  reviewedAt?: string | null
}
```

配对规则：同名（不含扩展名）的 JPG 和 RAW 文件归为一组。
支持的格式：JPG (.jpg, .jpeg)，RAW (.cr2, .cr3, .nef)。
ID 生成：MD5(标准化目录路径 + 文件基本名)。

存储方式：内存中的 Map（键为标准化文件夹路径），最多保留 10 个文件夹的数据。
扫描结果同时维护全局索引 `photoIndex: Map<id, PhotoGroup>` 供按 ID 查找。

### 4.2 ExifData（EXIF 数据）

```typescript
interface ExifData {
  camera: string       // "Canon EOS R5" 格式
  lens: string
  focalLength: string  // "50mm"
  aperture: string     // "f/1.8"
  shutterSpeed: string // "1/200s"
  iso: string          // "ISO 400"
  width: number
  height: number
  dateTime: string     // "2024-01-15 14:30:00"
  fileSize: string     // "25.3 MB (JPG 8.2 MB + RAW 17.1 MB)"
}
```

使用 exifr 库从源文件提取。文件大小自动合并 JPG 和所有关联 RAW 文件。

### 4.3 SubfolderInfo（子文件夹信息）

```typescript
interface SubfolderInfo {
  name: string    // 显示名称
  path: string    // 子文件夹相对路径
  count: number   // 该子文件夹下的照片数
}
```

由 `scanner.ts` 的 `getSubfolders()` 返回，供 FolderSidebar 和 GridContext 使用。

### 4.4 ReviewStatus（审阅状态）

```typescript
interface ReviewStatus {
  action: string      // 'keep' | 'deleted'
  reviewedAt: string  // ISO 时间戳
}
```

由 `review.ts` 的 `getReviewStatuses()` 返回。`GET /photos` 端点使用此数据为每张照片填充 `reviewAction` 和 `reviewedAt` 字段。

### 4.5 ReviewRecord（审阅记录）— 数据库表

```sql
CREATE TABLE review_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT UNIQUE NOT NULL,
  file_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('keep', 'deleted')),
  review_mode TEXT NOT NULL CHECK(review_mode IN ('sequential', 'random')),
  reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  cache_until DATETIME
);

CREATE INDEX IF NOT EXISTS idx_review_records_cache ON review_records(cache_until);
```

- `cache_until`：仅用于随机审阅模式，值为 `reviewed_at + random_cache_days`。
  已缓存的照片在随机审阅中不会重复出现，缓存过期后可再次出现。
- `random_cache_days` 设置存储在 `settings` 表中，默认 7 天。

### 4.6 Settings（设置）— 数据库表

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

当前仅有一个设置项：`random_cache_days`（默认 "7"）。

### 4.7 photo_hashes（照片哈希）— 数据库表

```sql
CREATE TABLE photo_hashes (
  file_path TEXT PRIMARY KEY,
  dhash TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

存储每张照片的 dHash 感知哈希（64-bit），用于相似图片聚类。`similarity.ts` 增量计算时跳过已有哈希的记录。

### 4.8 SimilarGroup（相似组）

```typescript
interface SimilarGroup {
  id: string           // MD5(排序后的 photo IDs 拼接) 前 12 位
  photos: PhotoGroup[] // 组内照片
  coverIndex: number   // 推荐保留的索引 (最大文件×分辨率)
  avgDistance: number   // 组内平均 Hamming 距离
}
```

两阶段聚类：先按拍摄时间预分组（默认 30s 间隔），再用 Union-Find 按哈希距离（默认 ≤10）合并。

### 4.9 AnalyzeResult（分析结果）

```typescript
interface AnalyzeResult {
  computed: number    // 新计算哈希数
  skipped: number     // 已有哈希跳过数
  totalGroups: number // 聚类组数
  totalPhotos: number // 聚类照片总数
}
```

### 4.10 SimilarStats（相似统计）

```typescript
interface SimilarStats {
  analyzed: number // 已计算哈希的照片数
  total: number    // 文件夹总照片数
  groups: number   // 当前聚类组数
}
```

## 5. API 接口

所有端点前缀 `/api`。Vite 开发代理转发到 `http://127.0.0.1:3001`。

### 5.1 文件夹

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/folders/browse?path=` | 浏览目录。path 为空时返回磁盘/卷列表。返回 `{ current, parent, children[] }` |
| POST | `/folders/scan` | 扫描文件夹。Body: `{ path }`。返回 `{ total, paired, orphanJpg, orphanRaw }` |
| GET | `/folders/subfolders?folder=` | 获取子文件夹列表。返回 `SubfolderInfo[]` |

### 5.2 照片

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/photos?folder=&page=&limit=&subfolder=&sort=` | 获取照片列表（分页，默认 2000）。返回 `{ photos, total }`。photos 包含 reviewAction/reviewedAt |
| GET | `/photos/:id/thumbnail` | 获取缩略图 (200px JPEG, Cache-Control: 1h) |
| GET | `/photos/:id/full` | 获取全尺寸图 (JPG 直接流式, RAW 转 JPEG, Cache-Control: 24h) |
| GET | `/photos/:id/exif` | 获取 EXIF 元数据 |
| DELETE | `/photos/:id` | 删除照片 (JPG+RAW 全部移至回收站) |

### 5.3 批量操作

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/batch/orphaned?folder=` | 获取孤立文件列表 `{ jpg[], raw[] }` |
| POST | `/batch/orphaned` | 批量删除孤立文件。Body: `{ type: 'jpg'\|'raw', folder }` |

### 5.4 审阅

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/reviews` | 提交审阅。Body: `{ photoId, action: 'keep'\|'deleted', mode: 'sequential'\|'random' }` |
| GET | `/reviews/random?folder=` | 获取一张未审阅照片（排除已缓存的） |
| GET | `/reviews/random/batch?folder=&count=N` | 获取 N 张不重复未审阅照片 (count 1-100, Fisher-Yates 洗牌)。返回 `{ photos, total }` |

### 5.5 统计与设置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/stats?folder=` | 审阅统计 `{ total, reviewed, pending, orphanJpg, orphanRaw }` |
| GET | `/settings` | 获取设置 `{ random_cache_days }` |
| PUT | `/settings` | 更新设置。Body: `{ random_cache_days }` |

### 5.6 相似聚类

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/similarity/analyze` | 分析文件夹相似图片。Body: `{ folder, timeGap?, hashThreshold? }`。SSE 流式返回进度事件 `progress`/`complete`/`error` |
| GET | `/similarity/groups?folder=&page=&limit=&timeGap=&hashThreshold=` | 获取相似组列表（分页，默认 50）。返回 `{ groups: SimilarGroup[], total }` |
| GET | `/similarity/stats?folder=` | 获取相似分析统计。返回 `{ analyzed, total, groups }` |

## 6. 状态管理

### 6.1 根级状态 — AppContext

`AppContext` 在 `App.tsx` 中通过 `AppProvider` 包裹所有路由，提供全局共享数据。

**状态**：
- `activeFolder: string` — 当前活跃文件夹
- `photos: PhotoGroup[]` — 当前文件夹所有照片（含 reviewAction/reviewedAt）
- `settings: Record<string, string>` — 服务端设置
- `isLoaded: boolean` — 是否已完成首次加载

**操作**：
- `loadPhotos(folder)` — 调用 scanFolder + getPhotos + getSettings，设置所有状态

HomePage 调用 `loadPhotos()` 后跳转到 `/grid`。

### 6.2 审阅页 — ReviewContext

`ReviewContext` 是审阅页 (`/review`) 的核心状态管理器，使用 React Context + useState。
依赖 `useApp()` 获取根级数据。

**状态**：
- `photos: PhotoGroup[]` — 本地照片列表（删除时即时更新）
- `filteredPhotos: PhotoGroup[]` — 按日期、状态、子文件夹筛选后的照片
- `currentIndex: number` — 当前浏览位置
- `currentPhoto: PhotoGroup | null` — 当前照片
- `selectedDate: string | null` — 日期筛选条件
- `statusFilter: StatusFilter` — 审阅状态筛选 ('all' | 'unreviewed' | 'reviewed')
- `subfolderFilter: string | null` — 子文件夹筛选条件
- `subfolders: SubfolderInfo[]` — 子文件夹列表
- `reviewedCount: number` — 已审阅照片数
- `leftSidebarOpen: boolean` — 左侧栏开关
- `rightPanelOpen: boolean` — 右侧面板开关
- `loading: boolean` — 加载状态
- `error: string` — 错误信息
- `monthGroups: MonthGroup[]` — 月份/日期分组数据

**操作**：
- `goTo(index)` — 跳转到指定位置
- `setDateFilter(date)` — 设置日期筛选（null 表示全部）
- `setStatusFilter(filter)` — 设置审阅状态筛选
- `setSubfolderFilter(filter)` — 设置子文件夹筛选（同时重置日期和索引）
- `toggleLeftSidebar()` / `toggleRightPanel()` — 切换侧栏
- `handleAction('keep' | 'deleted')` — 执行审阅操作
- `refresh()` — 重新加载照片列表

**操作流程** (handleAction)：
1. 调用 `api.submitReview()` 记录审阅结果
2. 若 action 为 'deleted'，调用 `api.deletePhoto()` 移至回收站，从本地列表移除
3. 若 action 为 'keep'，更新本地照片的 reviewAction/reviewedAt
4. 自动前进到下一张

### 6.3 日期分组 — useDateGroups

将照片按月→日二级分组，支持状态和子文件夹筛选。

```typescript
useDateGroups(photos, selectedDate, statusFilter, subfolderFilter)
```

**参数**：
- `photos: PhotoGroup[]` — 照片列表
- `selectedDate: string | null` — 日期筛选条件
- `statusFilter: StatusFilter` — 'all' | 'unreviewed' | 'reviewed'
- `subfolderFilter: string | null` — 子文件夹筛选条件

**返回**：
- `monthGroups: MonthGroup[]` — 月份数组，每月包含 `dates: DateGroup[]`（含 reviewedCount）
- `filteredPhotos` — 按所有条件筛选后的子集
- `dateOfIndex: Map<number, string>` — 索引到日期的映射

### 6.4 快捷键 — useKeyboardShortcuts

| 按键 | 操作 |
|------|------|
| ArrowLeft | 上一张 |
| ArrowRight | 下一张 |
| Space | 保留 |
| D | 删除 |
| R | 跳过（随机浏览模式） |
| [ | 切换左侧日期栏 |
| ] | 切换右侧详情面板 |

仅在非输入框焦点时生效。ReviewPage 和 RandomPage 均使用此 hook。

### 6.5 随机浏览页 — useRandomBatch

`useRandomBatch` 是随机浏览页 (`/random`) 的自定义 hook，封装批次状态和操作逻辑。

**状态**：
- `photos: PhotoGroup[]` — 当前批次照片
- `currentIndex: number` — 当前浏览位置
- `currentPhoto: PhotoGroup | null` — 当前照片
- `batchSize: number` — 批次大小 (默认 20, 可选 10/20/50/100)
- `actionedSet: Set<number>` — 当前批次已操作的索引集合
- `sessionReviewed: number` — 本次会话累计审阅数
- `loading: boolean` — 加载状态
- `error: string` — 错误信息
- `exhausted: boolean` — 无更多未审阅照片
- `rightPanelOpen: boolean` — 右侧面板开关

**操作**：
- `loadBatch(size?)` — 加载一批随机照片（调用 `api.getRandomPhotos`）
- `goTo(index)` / `goNext()` / `goPrev()` — 批次内导航
- `handleAction('keep' | 'deleted' | 'skip')` — 执行操作后自动前进，批次末尾自动加载下一批
- `changeBatchSize(size)` — 更改批次大小
- `toggleRightPanel()` — 切换详情面板

**批次耗尽处理**：当前批次最后一张操作完成后自动调用 `loadBatch()`，
服务端返回空数组时设置 `exhausted=true` 显示完成界面。

### 6.6 网格浏览页 — GridContext

`GridContext` 是网格浏览页 (`/grid`) 的核心状态，使用 React Context + useState。
依赖 `useApp()` 获取根级 photos 和 activeFolder。

**状态**：
- `photos: PhotoGroup[]` — 当前文件夹所有照片
- `filteredPhotos: PhotoGroup[]` — 按日期和子文件夹筛选后的照片
- `subfolderFilter: string | null` — 子文件夹筛选条件
- `subfolders: SubfolderInfo[]` — 子文件夹列表
- `selectedDate: string | null` — 日期筛选条件
- `columns: number` — 网格列数 (2-8, 默认 5)
- `dateSections: DateSection[]` — 按日期分组的照片区段 `{ date, label, count, photos }`
- `virtualItems: VirtualItem[]` — 虚拟化项列表 (header | photo-row)
- `dateIndexMap: Map<string, number>` — 日期到虚拟项索引的映射
- `monthGroups: MonthGroup[]` — 月份/日期分组数据
- `loading: boolean` — 加载状态

**操作**：
- `setSubfolderFilter(filter)` — 设置子文件夹筛选（同时重置日期选择）
- `setSelectedDate(date)` — 设置日期筛选
- `setColumns(n)` — 设置列数
- `refresh()` — 重新加载子文件夹列表
- `scrollToRef` — 滚动到指定日期的 ref

**网格页组件**：
- **FolderSidebar** — 左侧子文件夹树，点击切换筛选
- **YearTimeline** — 右侧垂直日期时间线，点击滚动到对应日期
- **Lightbox** — 全屏图片查看浮层，ESC 关闭，箭头导航
- **NavBar** — 全局导航栏，tab 风格切换 (Grid/Review/Random)，按路由显示对应控件

GridPage 使用 `@tanstack/react-virtual` 的 `useVirtualizer`，overscan=8。

### 6.7 新增 Hooks

- **useExif(photo)** — 单张照片 EXIF 懒加载，带取消支持。返回 `ExifData | null`
- **useDragImage(photo, onLoad?)** — 拖拽图片导出。将 img 元素通过 canvas→blob→File 转换，附加到 dataTransfer
- **useImageZoom()** — 缩放与平移管理。Ctrl+滚轮缩放 (1x-5x)，拖拽平移，双击重置。返回 `{ scale, resetZoom, zoomStyle, handleWheel, handlers }`

### 6.8 activeFolder 模块级状态

`client/src/api/index.ts` 中维护模块级变量 `activeFolder`，
同时 `AppContext` 也管理此值。HomePage 设置后跳转到 `/grid`。
API 层自动在请求中附加 `folder` 参数。

### 6.9 相似聚类页 — SimilarContext

`SimilarContext` 是相似聚类页 (`/similar`) 的核心状态管理器，使用 React Context + useState。
依赖 `useApp()` 获取根级 activeFolder。

**状态**：
- `status: 'idle' | 'analyzing' | 'done'` — 分析阶段
- `result: AnalyzeResult | null` — 分析结果
- `stats: SimilarStats | null` — 统计信息
- `progress: AnalyzeProgress | null` — SSE 进度
- `groups: SimilarGroup[]` — 聚类分组
- `selections: Map<groupId, Map<photoId, 'keep'|'delete'|null>>` — 每张照片的选择状态

**操作**：
- `analyze()` — 触发分析（SSE 流式），完成后加载分组
- `abortAnalyze()` — 中止分析
- `refreshStats()` — 刷新统计
- `toggleSelection(groupId, photoId)` — 切换单张删除选择
- `keepRecommended(groupId)` — 保留推荐照片，其余标记删除
- `deleteAllExceptRecommended(groupId)` — 同 keepRecommended
- `deleteSelected()` — 批量删除所有标记为 delete 的照片

**推荐策略**：组内选择 `fileSize * 10000 + width * height` 最大的照片为推荐保留项。

### 6.10 useStaggeredReveal

`useStaggeredReveal(staggerMs?)` 使用 IntersectionObserver 检测元素进入视口后触发子元素交错渐入动画。

**参数**：`staggerMs` — 子元素间延迟（默认 50ms）

**返回**：`{ ref, visible, childStyle }` — `childStyle(index)` 生成带 `transition-delay` 的样式对象。

## 7. 设计决策

### 7.1 内存存储 vs 数据库
扫描结果存储在 Node.js 进程内存（Map），不持久化。
理由：照片文件经常变化（增删），每次扫描重新计算更可靠。
审阅记录则持久化在 SQLite 中，用于跨会话追踪。

### 7.2 软删除
使用 `trash` 库将文件移至系统回收站，而非永久删除。
理由：安全网，防止误删。用户可在系统回收站中恢复。

### 7.3 LRU 缩略图缓存
内存中维护最多 500 条缩略图的 LRU 缓存。
理由：避免每次请求重复生成缩略图（sharp 处理有 CPU 开销），
但又不希望内存无限增长。

### 7.4 GET 请求自动重试
API 客户端层对 GET 请求自动重试最多 3 次，间隔递增（1s, 2s）。
理由：后端可能在 Vite 代理连接时尚未完全就绪。

### 7.5 胶片条窗口化
Filmstrip 组件仅渲染当前索引前后各 150 张缩略图。
理由：避免大量 DOM 节点导致性能问题。

### 7.6 安全设计
- 服务器仅监听 127.0.0.1:3001（不对外暴露）
- `isPathAllowed()` 拒绝系统目录（/etc, /usr, C:\Windows 等）
- 符号链接保护：扫描时 `fs.realpathSync()` 检测循环
- CORS 限制为 localhost:5173

### 7.7 跨平台支持
- 路径标准化：统一使用 `/` 分隔符（`normalizePath()`）
- 文件夹浏览：Windows 使用 PowerShell 探测盘符，macOS 读取 /Volumes
- 盘符根目录的特殊处理（Windows 盘符需要追加反斜杠）

### 7.8 虚拟化网格
GridPage 使用 `@tanstack/react-virtual` 实现虚拟化渲染，overscan=8。
理由：照片网格可能包含数千行，仅渲染可见区域的 DOM 节点，避免性能问题。

### 7.9 根级 AppContext
AppContext 在最顶层提供 activeFolder 和 photos，供 GridPage 和 ReviewPage 共享。
理由：扫描结果只需加载一次，多页面间共享避免重复请求。

## 8. 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端（concurrently） |
| `npm run dev:client` | 仅前端 (Vite, port 5173) |
| `npm run dev:server` | 仅后端 (tsx watch, port 3001) |
| `npm run build` | 构建前后端 |
| `npm run test:e2e` | 运行 E2E 测试 |
| `npm run test:e2e:headed` | 有头模式运行 E2E 测试 |
| `npm run test:photos` | 生成测试照片数据 |
| `npm run test:visual-photos` | 生成可视化测试照片 |
| `npm run test:visual` | 运行可视化回归测试 |
| `npm run test:report` | 生成测试报告 |
| `npm run test:full` | 完整测试流程 (生成数据+E2E+报告) |
| `npm run test:visual-full` | 完整可视化测试流程 |
| `npm run screenshot` | 全页面截图 (浏览器保持打开) |
| `npm run screenshot:close` | 截图后关闭浏览器 |
