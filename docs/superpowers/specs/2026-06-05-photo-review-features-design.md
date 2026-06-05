# Photo Review 功能扩展设计文档

> 日期：2026-06-05
> 状态：已批准

## Context

用户使用 Photo Review 进行三个场景：快速筛选废片、整理归档、精选出片。当前痛点：
1. **缺少对比和评分机制** — 无法并排比较相似照片，无法区分"不错"和"最佳"
2. **审阅后缺乏管理** — 只有 keep/deleted，没有标签/分组/导出

目标：通过审阅深度增强 + 组织管理两个方向共 9 个功能，建立完整的"审阅→管理→出片"闭环。

---

## 数据模型变更

在现有 SQLite 基础上新增 6 张表（migration version 3）：

```sql
-- 照片扩展元数据（评分、收藏）
CREATE TABLE photo_meta (
  photo_path TEXT PRIMARY KEY,
  rating INTEGER DEFAULT 0,       -- 0=未评分, 1-5
  favorite INTEGER DEFAULT 0,     -- 0/1
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 标签
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT,                      -- 预设色值
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 照片↔标签多对多
CREATE TABLE photo_tags (
  photo_path TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (photo_path, tag_id),
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 收藏集（手动 + 智能共用）
CREATE TABLE collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('manual','smart')),
  smart_rules TEXT,                -- JSON，智能相册规则
  cover_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 收藏集↔照片
CREATE TABLE collection_photos (
  collection_id INTEGER NOT NULL,
  photo_path TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (collection_id, photo_path),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

-- EXIF 结构化索引（用于过滤查询）
CREATE TABLE photo_exif_index (
  photo_path TEXT PRIMARY KEY,
  camera TEXT,
  lens TEXT,
  focal REAL,
  aperture REAL,
  shutter REAL,
  iso INTEGER,
  date_taken TEXT
);
CREATE INDEX idx_exif_camera ON photo_exif_index(camera);
CREATE INDEX idx_exif_lens ON photo_exif_index(lens);
CREATE INDEX idx_exif_date ON photo_exif_index(date_taken);
```

---

## 第一批：审阅深度增强（4 个功能）

### 1. 星级评分 + 收藏

**交互：**
- 审阅页：图片下方星级条 + 收藏心形按钮；快捷键 `1-5` 打分，`F` 切换收藏
- 网格页：缩略图角标显示星级和收藏状态
- 随机页：操作栏增加评分和收藏按钮
- 所有页面支持按星级/收藏筛选

**涉及文件：**
- `server/src/db/migrations.ts` — 新增表
- `server/src/services/review.ts` — 新增 rating/favorite 读写函数
- `server/src/routes/photos.ts` — 新增 rating/favorite 端点
- `client/src/api/index.ts` — 新增 API 调用
- `client/src/context/AppContext.tsx` — 全局 rating/favorite 状态
- `client/src/components/review/ReviewControls.tsx` — 评分/收藏按钮
- `client/src/components/review/DetailsPanel.tsx` — 详情面板中评分显示
- `client/src/components/grid/Lightbox.tsx` — Lightbox 中评分
- `client/src/components/ui/RatingStars.tsx` — 新建：星级组件
- `client/src/hooks/useKeyboardShortcuts.ts` — 新增快捷键

### 2. 并排对比模式

**设计：**
- 全屏浮层组件，2-4 张照片同屏并排
- 同步缩放（复用 useImageZoom）
- 底部可展开 EXIF 对比面板（高亮不同项）
- 逐张可操作（评分/收藏/keep/delete）
- 快捷键：Tab 切换焦点，`[` `]` 调整并排数量

**触发入口：**
- 网格页多选 → "对比"按钮
- 相似页聚类 → "并排对比"入口
- 审阅页胶片条多选 → 对比

**涉及文件：**
- `client/src/components/CompareView.tsx` — 新建：对比浮层组件
- `client/src/components/CompareExifPanel.tsx` — 新建：EXIF 对比表格
- `client/src/components/grid/GridPage.tsx` — 多选 + 对比入口
- `client/src/components/similar/ClusterCard.tsx` — 对比入口
- `client/src/components/review/Filmstrip.tsx` — 多选 + 对比入口

### 3. 撤销系统

**设计：**
- 前端操作历史栈，存最近 50 步
- 记录类型：评分、收藏、审阅（keep/deleted）、标签操作
- 每步 `{ type, photoId, before, after, timestamp }`
- `Ctrl+Z` 触发，toast 提示已撤销内容
- 同步调用后端恢复 before 状态
- 页面切换不清空，当前会话有效

**涉及文件：**
- `client/src/hooks/useUndoHistory.ts` — 新建：撤销历史栈
- `client/src/context/ReviewContext.tsx` — 操作时入栈
- `client/src/context/AppContext.tsx` — 操作时入栈
- `client/src/hooks/useKeyboardShortcuts.ts` — Ctrl+Z 绑定
- `client/src/components/ui/Toast.tsx` — 新建：轻量 toast 组件

### 4. EXIF 高级过滤

**设计：**
- 网格页顶部工具栏新增"筛选"按钮 → 展开过滤面板
- 维度：相机、镜头、焦距范围、光圈范围、快门速度范围、ISO 范围、日期范围
- 选项从 EXIF 索引表动态生成（SELECT DISTINCT）
- 首次扫描时异步填充 EXIF 索引表

**涉及文件：**
- `server/src/db/migrations.ts` — photo_exif_index 表
- `server/src/services/exif.ts` — 新增批量索引填充函数
- `server/src/services/scanner.ts` — 扫描完成后触发 EXIF 索引
- `server/src/routes/photos.ts` — 新增过滤查询端点 + 过滤选项端点
- `client/src/api/index.ts` — 新增过滤 API
- `client/src/components/grid/FilterPanel.tsx` — 新建：过滤面板
- `client/src/context/GridContext.tsx` — 过滤状态管理

---

## 第二批：组织管理（5 个功能）

### 5. 标签系统

**交互：**
- 审阅页详情面板：标签区域，点击添加
- 网格页：多选 → 批量打标签
- 输入搜索已有标签，回车新建
- 所有页面支持按标签过滤（与 EXIF 过滤组合）

**涉及文件：**
- `server/src/routes/tags.ts` — 新建：标签 CRUD 路由
- `server/src/services/tags.ts` — 新建：标签业务逻辑
- `server/src/routes/index.ts` — 注册 tags 路由
- `client/src/context/TagsContext.tsx` — 新建：标签全局状态
- `client/src/components/ui/TagInput.tsx` — 新建：标签输入组件（自动补全）
- `client/src/components/ui/TagBadge.tsx` — 新建：标签徽章
- `client/src/components/review/DetailsPanel.tsx` — 添加标签区域
- `client/src/components/grid/FilterPanel.tsx` — 标签过滤

### 6. 收藏集 / 精选集

**设计：**
- 新页面 `/collections`：收藏集卡片网格（封面 + 名称 + 照片数）
- 点击进入收藏集详情：类似网格页浏览，支持排序
- 创建方式：任意页面多选 → "加入收藏集" → 选已有或新建
- 支持拖拽排序、移除照片、设置封面

**涉及文件：**
- `server/src/routes/collections.ts` — 新建：收藏集 CRUD + 照片管理
- `server/src/services/collections.ts` — 新建：收藏集业务逻辑
- `server/src/routes/index.ts` — 注册 collections 路由
- `client/src/pages/CollectionsPage.tsx` — 新建：收藏集列表页
- `client/src/pages/CollectionDetailPage.tsx` — 新建：收藏集详情页
- `client/src/components/collections/CollectionCard.tsx` — 新建：收藏集卡片
- `client/src/App.tsx` — 新增两条路由
- `client/src/components/NavBar.tsx` — 新增导航项

### 7. 日历视图

**设计：**
- 新页面 `/calendar`
- 双视图：月历视图（每日照片数 + 小缩略图）+ 热力图视图（类 GitHub contribution graph）
- 点击某天 → 下方展开照片网格
- 照片支持评分/标签/加入收藏集

**涉及文件：**
- `server/src/routes/photos.ts` — 新增日历聚合端点
- `client/src/pages/CalendarPage.tsx` — 新建：日历页
- `client/src/components/calendar/MonthGrid.tsx` — 新建：月历组件
- `client/src/components/calendar/HeatmapChart.tsx` — 新建：热力图组件
- `client/src/App.tsx` — 新增路由
- `client/src/components/NavBar.tsx` — 新增导航项

### 8. 批量导出

**设计：**
- 触发：网格多选 / 收藏集详情 / 筛选结果 → "导出"按钮
- 导出对话框：目标目录、内容类型（JPG/RAW/全部）、命名规则、子目录结构
- 后台异步执行，SSE 推送进度，支持取消
- 完成后 toast 提示 + "打开目录"

**涉及文件：**
- `server/src/routes/export.ts` — 新建：导出任务路由
- `server/src/services/exporter.ts` — 新建：异步导出服务
- `server/src/routes/index.ts` — 注册 export 路由
- `client/src/components/ui/ExportDialog.tsx` — 新建：导出对话框
- `client/src/hooks/useExportTask.ts` — 新建：导出任务 hook
- `client/src/components/grid/GridPage.tsx` — 导出入口
- `client/src/pages/CollectionDetailPage.tsx` — 导出入口

### 9. 智能相册

**设计：**
- 收藏集页面创建，设置 AND 组合规则（星级/标签/日期/EXIF/收藏/审阅状态）
- 动态计算：打开时实时查询最新数据
- 显示匹配照片数量
- 可临时锁定（冻结为手动收藏集）
- 复用 collections 表的 type='smart' + smart_rules JSON

**涉及文件：**
- `server/src/services/collections.ts` — 规则解析 + 动态查询
- `client/src/components/collections/SmartAlbumEditor.tsx` — 新建：规则构建器
- `client/src/pages/CollectionsPage.tsx` — 新建智能相册入口

---

## 实施顺序

```
Phase 1  数据基础 + 评分收藏
  ├── DB migration (6 张新表)
  ├── 评分/收藏 API + UI
  └── 撤销系统

Phase 2  对比 + 过滤
  ├── EXIF 索引表填充
  ├── 并排对比模式
  └── EXIF 过滤面板

Phase 3  标签 + 收藏集
  ├── 标签系统
  ├── 收藏集页面
  └── 智能相册

Phase 4  视图 + 导出
  ├── 日历视图
  └── 批量导出
```

---

## 验证方式

每个 Phase 完成后：
1. `npm run build` 确认编译通过
2. `npm run dev` 手动测试新功能
3. 新增对应 e2e spec 文件，运行 `npm run test:e2e`
4. 更新 `docs/architecture/agent-index.md` 路由表
