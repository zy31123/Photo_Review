# 照片审阅工具 UI 重构设计

## 背景

当前随机浏览功能入口隐蔽（仅审阅页工具栏一个小图标），删除操作无确认流程（按 D 立即删除），批次浏览完无提示。需要将随机浏览提升为主要功能，增加网格总览首页，并引入延迟删除确认机制。

## 设计目标

1. 随机浏览成为与顺序审阅平级的主要功能
2. 文件夹选择后首个页面为图片网格总览
3. 删除操作延迟到批次结束时批量确认
4. 统一全局状态管理

## 架构变更

### 全局状态 — AppContext（新建）

引入 `AppContext` 替代分散的状态管理，所有页面共享照片数据和删除队列。

```
AppContext
├── activeFolder          — 当前文件夹
├── photos: PhotoGroup[]  — 全局照片数据
├── pendingDeletions      — 待删除队列 PhotoGroup[]
├── settings              — 全局设置
├── loadPhotos(folder)    — 扫描 & 加载照片
├── markForDeletion(id)   — 标记待删除
├── confirmDeletion(ids)  — 批量确认删除（调 API + 清空队列）
├── undoMark(id)          — 撤销标记
└── isLoaded: boolean     — 是否已加载文件夹数据
```

现有状态管理变更：
- `ReviewContext` — 保留，照片数据来源改为 `AppContext.photos`
- `useRandomBatch` — 删除逻辑改为 `markForDeletion`，不直接调删除 API
- `HomePage` — 扫描后调用 `loadPhotos`，跳转网格页

### 页面路由调整

| 路由 | 页面 | 变更 |
|------|------|------|
| `/` | HomePage | 保持不变（选文件夹） |
| `/grid` | GridPage | **新增**：网格总览，文件夹后默认页 |
| `/review` | ReviewPage | 接收 `?startId=xxx` 参数，支持从网格跳入 |
| `/random` | RandomPage | 改造：延迟删除 + 侧边栏 |
| `/batch` | BatchPage | 保持不变 |

页面流转：
```
首页（选文件夹）→ 网格总览（/grid）→ 审阅/随机/批量（通过导航栏切换）
```

未加载文件夹时，网格/审阅/随机/批量页重定向到首页。

## 组件设计

### 1. NavBar（新建）— 全局导航栏

固定在所有页面顶部（首页除外）。

布局：
```
[Photo Review] [网格总览] [顺序审阅] [随机浏览] [批量处理]    [trash-icon 3 待删除] [folder-icon 文件夹名]
```

注意：使用 SVG 图标（Lucide Trash2 / Folder），不使用 emoji。

- 当前页面高亮（蓝色背景）
- 待删除徽章：红色圆点计数 + "待删除"文字，仅 `pendingDeletions.length > 0` 时显示
- 点击徽章打开删除确认面板
- 右侧显示当前文件夹名

### 2. GridPage（新建）— 网格总览页

文件夹后的默认着陆页，平铺展示所有照片缩略图。

**工具栏：**
- 密度切换按钮组：3 / 4 / 6 / 8 列
- 照片总数统计
- 可选：日期分组折叠

**网格：**
- 响应式缩略图网格，默认 4 列
- 虚拟滚动（只渲染可见区域 DOM），支持大文件夹（数千张）
- 图片懒加载，使用已有缩略图 API
- 单击 → Lightbox 放大预览（同页内模态框）
- 双击 → 跳转 `/review?startId=xxx`

**Lightbox：**
- 居中大图预览，背景半透明遮罩
- 左右箭头切换
- ESC 关闭

### 3. RandomPage 改造

#### 布局变更

从全屏单张浏览改为 `主内容区 + 右侧待删除面板`。

```
[NavBar]
[            照片浏览区            ] [待删除面板]
[    上/下一张 + 操作按钮          ] [缩略图列表]
                                    [确认删除按钮]
```

#### 删除流程改造

当前（立即删除）：
```
按 D → api.submitReview() → api.deletePhoto() → 移除照片
```

改为（延迟删除）：
```
按 D → api.submitReview(action='deleted') → appContext.markForDeletion(id) → 移除照片（仅从本地列表）
```

#### 侧边栏待删除面板

- 始终可见，显示 `pendingDeletions` 列表
- 每项：缩略图 + 文件名 + 文件大小
- 每项有撤销按钮（`undoMark`）
- 底部"确认删除 (N)"按钮 → 打开确认面板
- 无待删除项时显示空状态："尚未标记照片"

#### 批次结束行为

当批次最后一张操作完毕：
1. 自动弹出删除确认面板
2. 如无待删除项，显示"本批已浏览完毕"提示 + "加载下一批"按钮

### 4. DeletionPanel（新建）— 删除确认模态框

所有页面共享（通过 NavBar 徽章或随机浏览侧边栏触发）。

**内容：**
- 标题："确认删除照片"
- 副标题："以下 N 张照片将被移至回收站"
- 网格预览：待删照片缩略图，带红色边框
- 每张可点击取消选中（不想删的那张去掉选中状态）
- 汇总行："共计 N 张 · XX.X MB"
- 全选 / 全不选
- 操作按钮：[取消] [确认删除]

**确认后：**
- 调用 `api.deletePhoto()` 逐个删除
- 清空 `pendingDeletions`
- 显示操作结果（成功 N 张）

### 5. ReviewPage 调整

- 接收 `startId` 查询参数，从指定照片开始审阅
- 无参数时保持原行为（从第一张开始）
- 导航改为 NavBar，移除工具栏中随机浏览/批量处理图标（已移至 NavBar）
- **删除行为不变**：审阅页按 D 仍然立即删除（与随机浏览的延迟删除区分）

### 6. HomePage 调整

- 扫描完成后跳转 `/grid`（而非 `/review`）

## 后端变更

### API 无新增端点

现有 API 已满足需求：
- `DELETE /api/photos/:id` — 确认删除时调用
- `POST /api/reviews` — 提交审阅记录不变
- `GET /api/reviews/random/batch` — 随机批次不变

### 数据库无变更

## 文件变更清单

### 新增文件
- `client/src/context/AppContext.tsx` — 全局状态
- `client/src/components/NavBar.tsx` — 导航栏
- `client/src/pages/GridPage.tsx` — 网格总览页
- `client/src/components/grid/GridToolbar.tsx` — 网格工具栏（密度切换）
- `client/src/components/grid/Lightbox.tsx` — 灯箱预览
- `client/src/components/DeletionPanel.tsx` — 删除确认模态框
- `client/src/components/random/DeletionSidebar.tsx` — 随机浏览待删除侧边栏

### 新增依赖

- `@tanstack/react-virtual` — 网格页虚拟滚动

### 修改文件
- `client/src/App.tsx` — 添加 `/grid` 路由，引入 AppContext 和 NavBar
- `client/src/context/ReviewContext.tsx` — 照片数据来源改为 AppContext
- `client/src/hooks/useRandomBatch.ts` — 删除逻辑改为 markForDeletion
- `client/src/pages/RandomPage.tsx` — 集成侧边栏，移除工具栏中的导航按钮
- `client/src/pages/ReviewPage.tsx` — 支持 startId 参数，移除工具栏导航按钮
- `client/src/components/review/ReviewToolbar.tsx` — 移除随机浏览/批量处理图标
- `client/src/pages/HomePage.tsx` — 跳转目标改为 `/grid`

### 删除文件
- 无（保留所有现有组件，仅调整内部逻辑）

## UX 规范

### 设计风格
- 深色主题，沉浸式照片浏览体验（类似 Lightroom/Darkroom）
- 内容优先：照片占最大面积，控件最小化
- 交互区域 ≥44px，键盘快捷键可见

### 键盘快捷键

| 按键 | 网格页 | 审阅页 | 随机浏览 |
|------|--------|--------|----------|
| `←` / `→` | Lightbox 切换 | 上一张/下一张 | 上一张/下一张 |
| `Space` | — | 保留 | 保留 |
| `D` | — | 废片 | 标记删除 |
| `R` | — | — | 跳过 |
| `ESC` | 关闭 Lightbox | — | — |
| `Enter` | — | — | 确认删除（面板打开时） |

### 动画
- Lightbox 开关：fade 150ms
- 删除确认面板：slide-up 200ms ease-out
- 导航栏无动画（固定元素）
- 侧边栏展开/折叠：width transition 200ms

## 验证方案

1. **首页 → 网格**：扫描后跳转网格页，缩略图正常加载
2. **网格密度切换**：3/4/6/8 列布局正确，无布局抖动
3. **网格交互**：单击打开 Lightbox，双击跳转审阅页从正确照片开始
4. **导航栏**：所有页面顶部导航一致，当前页高亮
5. **随机浏览延迟删除**：按 D 标记但不删除，侧边栏显示待删除列表
6. **撤销标记**：侧边栏点击撤销，照片从待删除列表移除
7. **批次结束确认**：最后一张操作完后弹出确认面板
8. **确认删除**：面板中确认后，API 调用正确，照片被移至回收站
9. **顶栏徽章**：非随机浏览页面也能看到待删除计数，点击打开确认面板
10. **E2E 测试**：更新现有测试，新增网格页和删除确认流程测试
