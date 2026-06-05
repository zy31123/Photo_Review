# Agent 路由索引

> ⚠️ 收到任何涉及代码的任务时，**必须先查下表定位文件**，禁止用 Glob/Grep 全局搜索来发现文件结构。

## 任务路由表

| 任务 | 先读 | 再读 | 说明 |
|------|------|------|------|
| 修改扫描逻辑 | scanner.ts | routes/index.ts, api/index.ts | 扫描配对在 scanner，端点在 routes，客户端在 api |
| 添加图片格式 | scanner.ts (JPG_EXTS/RAW_EXTS) | image.ts, exif.ts | 格式定义在 scanner，处理在 image/exif |
| 修改审阅流程 | ReviewContext.tsx | ReviewPage.tsx, ReviewControls.tsx, NavBar.tsx, review.ts | 前端状态在 Context，后端逻辑在 review.ts |
| 修改网格浏览 | GridContext.tsx | GridPage.tsx, FolderSidebar.tsx, YearTimeline.tsx, Lightbox.tsx | 前端状态在 Context，四个子组件 |
| 修改随机浏览 | useRandomBatch.ts | RandomPage.tsx, RandomToolbar.tsx, RandomControls.tsx, review.ts | hook 管理批次状态，后端用 review.ts |
| 修改相似聚类 | SimilarContext.tsx | SimilarPage.tsx, similarity.ts, ClusterCard.tsx | 前端状态在 Context，后端算法在 similarity.ts |
| 修改 API 端点 | routes/index.ts | 对应 service 文件, api/index.ts | 端点定义在 routes，客户端封装在 api |
| 修改 UI 样式 | index.css | 对应组件 | Tailwind 4 @theme 配色在 index.css |
| 修改快捷键 | useKeyboardShortcuts.ts | ReviewPage.tsx | 快捷键定义在 hook，绑定在 ReviewPage |
| 修改数据库表 | db/index.ts | review.ts, similarity.ts | 建表在 db，消费方在两个 service |
| 添加新页面 | App.tsx | 参考现有页面, api/index.ts | 路由注册在 App，参考最接近的现有页面 |
| 修改文件夹浏览 | FolderPicker.tsx | routes/index.ts (browse) | 前端模态框 + 后端浏览端点 |
| 修改子文件夹 | scanner.ts (getSubfolders) | GridContext.tsx, FolderSidebar.tsx, routes/index.ts | 扫描器提供数据，网格页消费 |
| 修改全局导航 | NavBar.tsx | App.tsx | 导航栏组件 + 路由定义 |
| 修改通用 UI | ui/ActionBtn.tsx | ui/Tooltip.tsx, ui/Badge.tsx, ui/SegmentedControl.tsx | ui/ 下所有共享组件 |
| 安全相关 | routes/index.ts (isPathAllowed) | server/src/index.ts (127.0.0.1 绑定) | 路径白名单 + 网络绑定 |
| 修改 e2e 测试 | playwright.config.ts | e2e/helpers.ts, 对应 spec 文件 | Playwright 配置在根目录，辅助函数在 helpers，每页面一个 spec |
| 修改根级状态 | AppContext.tsx | api/index.ts, HomePage.tsx | 根 Context + API 层 + 首页初始化 |

## 文件索引

### 服务端 (`server/src/`)

- `services/scanner.ts` — 文件扫描 + JPG/RAW 配对 + MD5 ID + 子文件夹 + 孤立文件检测
- `services/image.ts` — 缩略图生成 (sharp) + LRU 缓存 (500) + RAW 转 JPEG
- `services/exif.ts` — EXIF 提取 (exifr) + JPG/RAW 文件大小合并
- `services/review.ts` — 审阅记录 + 随机选取 (Fisher-Yates) + 缓存 + 统计
- `services/similarity.ts` — dHash 感知哈希 + Union-Find 聚类 + 增量计算 + 持久化
- `services/deleter.ts` — 删除到回收站 (trash)
- `db/index.ts` — SQLite WAL + 建表 (review_records, settings, photo_hashes)
- `routes/index.ts` — 18 个 REST 端点 + 路径白名单 + 盘符探测
- `utils/path.ts` — normalizePath(), resolveNormalized()
- `index.ts` — Express 入口, CORS, 127.0.0.1:3001

### 客户端 (`client/src/`)

**页面 (`pages/`):**
- `HomePage.tsx` — 文件夹选择 + 扫描触发 + 跳转 /grid
- `GridPage.tsx` — 虚拟化网格 + Lightbox + 文件夹/日期导航
- `ReviewPage.tsx` — 三栏审阅布局（核心页面）
- `RandomPage.tsx` — 批次随机 + 详情面板
- `SimilarPage.tsx` — 相似聚类分析流程

**Context (`context/`):**
- `AppContext.tsx` — 根级状态 (activeFolder, photos, settings, loadPhotos)
- `GridContext.tsx` — 网格页状态 (dateSections, virtualItems, subfolder 过滤)
- `ReviewContext.tsx` — 审阅页状态 (筛选/操作/导航)
- `SimilarContext.tsx` — 相似页状态 (分析/聚类/选择/删除)

**Hooks (`hooks/`):**
- `useDateGroups.ts` — 月→日分组 (支持状态和子文件夹筛选)
- `useKeyboardShortcuts.ts` — Arrow/D/Space/[/] 快捷键
- `useRandomBatch.ts` — 随机批次管理 (加载/导航/操作)
- `useExif.ts` — 单张 EXIF 懒加载
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
- `review/ReviewControls.tsx` — 操作按钮
- `review/DetailsPanel.tsx` — EXIF 详情面板
- `review/PhotoDetailsView.tsx` — 纯展示照片详情 (可复用)
- `review/Filmstrip.tsx` — 胶片条 (窗口化 150+150)
- `random/RandomControls.tsx` — 随机模式操作按钮
- `random/RandomToolbar.tsx` — 随机模式工具栏
- `random/BatchSelector.tsx` — 批次大小选择器
- `similar/SimilarToolbar.tsx` — 分析/统计/批量删除
- `similar/ClusterCard.tsx` — 相似组卡片
- `similar/ClusterGrid.tsx` — 卡片网格
- `shared/DateSidebarBase.tsx` — 日期侧栏基组件
- `shared/useCollapsedMonths.ts` — 月折叠状态
- `ui/ActionBtn.tsx` — 圆形操作按钮
- `ui/Badge.tsx` — 状态标签
- `ui/EmptyState.tsx` — 空状态占位
- `ui/LoadingSpinner.tsx` — 加载旋转器
- `ui/SectionHeader.tsx` — 分区标题
- `ui/SegmentedControl.tsx` — 分段选择器
- `ui/ToolbarDivider.tsx` — 垂直分隔线
- `ui/Tooltip.tsx` — 悬浮提示

**其他:**
- `api/index.ts` — 所有后端调用封装 + 类型定义 + GET 自动重试 (3 次)
- `App.tsx` — 5 条路由: `/` `/grid` `/review` `/random` `/similar`
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
- `SimilarGroup` → `server/src/services/similarity.ts`
- 数据库表结构 → `server/src/db/index.ts`
