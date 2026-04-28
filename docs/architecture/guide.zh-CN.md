# Photo Review 架构说明

## 1. 项目概述

Photo Review 是一个本地照片审查工具，采用 Darkroom（暗房）视觉主题。
用户选择本地文件夹后，系统自动扫描 JPG/RAW 文件并配对，
支持逐张审阅、随机审阅、批量处理孤立文件。

架构：npm workspaces monorepo，`client/`（React 前端）和 `server/`（Express 后端）。
Vite 开发代理将 `/api` 转发至后端 3001 端口。

## 2. 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 前端框架 | React + TypeScript | React 19 |
| 路由 | react-router-dom | 7.x |
| 构建 | Vite | 6.x |
| 样式 | Tailwind CSS | 4.x (@tailwindcss/vite 插件) |
| 后端框架 | Express + TypeScript | Express 5 |
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
│       ├── App.tsx                 # 路由定义：/ /review /batch /random
│       ├── api/index.ts            # API 客户端层，所有后端调用封装
│       ├── context/
│       │   └── ReviewContext.tsx    # 审阅页状态管理 (ReviewProvider + useReview)
│       ├── hooks/
│       │   ├── useDateGroups.ts    # 日期分组计算 (月→日二级分组)
│       │   └── useKeyboardShortcuts.ts # 全局快捷键
│       ├── pages/
│       │   ├── HomePage.tsx        # 首页：文件夹选择 + 扫描触发
│       │   ├── ReviewPage.tsx      # 审阅页：三栏布局，核心页面
│       │   ├── BatchPage.tsx       # 批量处理：孤立文件展示 + 批量删除
│       │   └── RandomPage.tsx      # 随机审阅：单张随机展示
│       ├── components/
│       │   ├── FolderPicker.tsx    # 文件夹浏览器 (模态框)
│       │   ├── review/
│       │   │   ├── DateSidebar.tsx       # 左侧日期导航
│       │   │   ├── ImageViewport.tsx     # 中央图片视口
│       │   │   ├── ReviewControls.tsx    # 底部悬浮操作按钮
│       │   │   ├── ReviewToolbar.tsx     # 顶部工具栏
│       │   │   ├── DetailsPanel.tsx      # 右侧详情面板
│       │   │   └── Filmstrip.tsx         # 底部胶片条
│       │   └── ui/
│       │       └── SectionHeader.tsx     # 通用分区标题
│       └── styles/
│           └── index.css           # Tailwind 4 @theme (Darkroom 配色系统)
├── server/
│   ├── package.json                # type: module
│   └── src/
│       ├── index.ts                # Express 入口，CORS，端口 127.0.0.1:3001
│       ├── db/index.ts             # SQLite 连接 (WAL)，建表逻辑
│       ├── routes/index.ts         # 14 个 API 端点 + 路径安全白名单
│       ├── services/
│       │   ├── scanner.ts          # 文件扫描 + JPG/RAW 配对
│       │   ├── image.ts            # 缩略图生成 + LRU 缓存
│       │   ├── exif.ts             # EXIF 元数据提取
│       │   ├── review.ts           # 审阅记录 + 随机选取 + 统计
│       │   └── deleter.ts          # 删除到回收站
│       └── utils/
│           └── path.ts             # 路径标准化工具
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

### 4.3 ReviewRecord（审阅记录）— 数据库表

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
```

- `cache_until`：仅用于随机审阅模式，值为 `reviewed_at + random_cache_days`。
  已缓存的照片在随机审阅中不会重复出现，缓存过期后可再次出现。
- `random_cache_days` 设置存储在 `settings` 表中，默认 7 天。

### 4.4 Settings（设置）— 数据库表

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

当前仅有一个设置项：`random_cache_days`（默认 "7"）。

## 5. API 接口

所有端点前缀 `/api`。Vite 开发代理转发到 `http://127.0.0.1:3001`。

### 5.1 文件夹

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/folders/browse?path=` | 浏览目录。path 为空时返回磁盘/卷列表。返回 `{ current, parent, children[] }` |
| POST | `/folders/scan` | 扫描文件夹。Body: `{ path }`。返回 `{ total, paired, orphanJpg, orphanRaw }` |

### 5.2 照片

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/photos?folder=&page=&limit=` | 获取照片列表（分页，默认 2000） |
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

### 5.5 统计与设置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/stats?folder=` | 审阅统计 `{ total, reviewed, pending, orphanJpg, orphanRaw }` |
| GET | `/settings` | 获取设置 `{ random_cache_days }` |
| PUT | `/settings` | 更新设置。Body: `{ random_cache_days }` |

## 6. 状态管理

### 6.1 审阅页 — ReviewContext

`ReviewContext` 是审阅页 (`/review`) 的核心状态管理器，使用 React Context + useState。

**状态**：
- `photos: PhotoGroup[]` — 当前文件夹所有照片
- `filteredPhotos: PhotoGroup[]` — 按日期筛选后的照片
- `currentIndex: number` — 当前浏览位置
- `currentPhoto: PhotoGroup | null` — 当前照片
- `selectedDate: string | null` — 日期筛选条件
- `leftSidebarOpen: boolean` — 左侧栏开关
- `rightPanelOpen: boolean` — 右侧面板开关
- `loading: boolean` — 加载状态
- `error: string` — 错误信息
- `reviewedIds: Set<string>` — 本次会话已审阅的照片 ID 集合
- `monthGroups: MonthGroup[]` — 月份/日期分组数据

**操作**：
- `goTo(index)` — 跳转到指定位置
- `setDateFilter(date)` — 设置日期筛选（null 表示全部）
- `toggleLeftSidebar()` / `toggleRightPanel()` — 切换侧栏
- `handleAction('keep' | 'deleted')` — 执行审阅操作（删除时调 API，然后提交记录，最后前进）
- `refresh()` — 重新加载照片列表

**操作流程** (handleAction)：
1. 若 action 为 'deleted'，调用 `api.deletePhoto()` 移至回收站
2. 调用 `api.submitReview()` 记录审阅结果
3. 将 photoId 加入 `reviewedIds`
4. 自动前进到下一张

### 6.2 日期分组 — useDateGroups

将照片按月→日二级分组，返回：
- `monthGroups: MonthGroup[]` — 月份数组，每月包含 `dates: DateGroup[]`
- `filteredPhotos` — 按 `selectedDate` 筛选后的子集
- `dateOfIndex: Map<number, string>` — 索引到日期的映射

### 6.3 快捷键 — useKeyboardShortcuts

| 按键 | 操作 |
|------|------|
| ArrowLeft | 上一张 |
| ArrowRight | 下一张 |
| Space | 保留 |
| D | 删除 |
| [ | 切换左侧日期栏 |
| ] | 切换右侧详情面板 |

仅在非输入框焦点时生效。ReviewPage 使用此 hook，RandomPage 自行注册内联事件监听器。

### 6.4 其他页面状态

- **BatchPage** — 页面级 useState，管理孤立文件列表、删除确认弹窗、处理状态。
- **RandomPage** — 页面级 useState + useCallback，管理当前随机照片、已审阅计数、缓存天数设置。
  内联 keydown 事件监听器（Space 保留，D 删除，R 跳过）。

### 6.5 activeFolder 模块级状态

`client/src/api/index.ts` 中维护一个模块级变量 `activeFolder`。
HomePage 设置此值后跳转到审阅页，API 层自动在请求中附加 `folder` 参数。
其他页面通过 `getActiveFolder()` 检查是否有活跃文件夹。

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

## 8. 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端（concurrently） |
| `npm run dev:client` | 仅前端 (Vite, port 5173) |
| `npm run dev:server` | 仅后端 (tsx watch, port 3001) |
| `npm run build` | 构建前后端 |
