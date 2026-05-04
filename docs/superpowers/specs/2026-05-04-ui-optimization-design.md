# UI 优化设计文档

**日期**: 2026-05-04
**范围**: 全部 4 个页面，按 P0→P3 分步提交
**方案**: Token-first — 先扩展 @theme token，再逐步应用到组件

---

## Context

UI 评分报告显示 4 个页面平均 5.25/10，核心问题：排版层级缺失、空状态粗糙、网格卡片无边界、侧边栏间距不统一。本设计通过建立统一的设计 token 和排版规范，系统性解决这些问题。

---

## Step 0: Token 系统扩展

**文件**: `client/src/styles/index.css` — `@theme` 块

### 新增阴影 token

```css
--shadow-card: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
--shadow-raised: 0 4px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2);
--shadow-overlay: 0 20px 60px rgba(0,0,0,0.5);
```

### 清理未使用 token

以下 token 已定义但从未被引用，确认无使用后移除：
- `--color-bg-overlay` → 保留，可能用于未来 Lightbox
- `--color-border-faint` → 保留，P1 侧边栏会用到
- `--color-accent-glow` → 移除
- `--color-danger-dim` → 保留，ActionBtn danger hover 可用
- `--color-success-dim` → 保留，ActionBtn success hover 可用
- `--color-text-caption` → 移除，与 `text-muted` 重叠

### 排版语义映射（注释规范，不新增 token）

| 语义角色 | Tailwind 类名 | 用途 |
|---|---|---|
| 页面标题 | `text-xl font-semibold text-text-heading` | 侧边栏"全部照片"、模态框标题 |
| 区段标题 | `text-xs font-semibold tracking-widest uppercase text-text-muted` | 月份分组、SectionHeader |
| 列表项 | `text-sm text-text-secondary` | 日期行、子文件夹项 |
| 正文值 | `text-sm font-medium text-text` | MetaRow 值、详情信息 |
| 正文标签 | `text-sm text-text-muted` | MetaRow 标签 |
| 辅助文字 | `text-xs text-text-muted` | 进度、徽章、计数 |

---

## Step 1: P0 — 排版层级统一

### 1.1 侧边栏统一

**目标**: GridDateSidebar 和 DateSidebar (Review) 使用完全一致的规格。

| 元素 | 当前 (Grid → Review) | 统一后 |
|---|---|---|
| "全部照片" | `text-xl` / `text-lg` | `text-xl font-semibold` |
| 月份标题 | `text-sm` / 无 | `text-xs font-semibold tracking-widest uppercase text-text-muted` |
| 日期行 | `text-base py-3` / `text-base py-3` | `text-sm py-2.5 pl-5 pr-3` |
| 子文件夹项 | `text-base py-3 px-5` / `text-sm py-2.5 px-4` | `text-sm py-2.5 px-4` |
| 容器 padding | `px-3 pb-6` / inline `paddingLeft:12` | `px-3 pb-6`（移除 inline style） |
| 头部 padding | `px-4 pt-5 pb-3` / `px-4 pt-4 pb-2` | `px-4 pt-5 pb-3` |

**修改文件**:
- `client/src/components/grid/GridDateSidebar.tsx`
- `client/src/components/review/DateSidebar.tsx`

### 1.2 工具栏高度统一

三个页面统一 `h-13`（52px），与 NavBar 一致：

| 文件 | 当前 | 统一后 |
|---|---|---|
| GridToolbar.tsx | `h-14` | `h-13` |
| ReviewToolbar.tsx | `h-12` | `h-13` |
| RandomToolbar.tsx | `h-12` | `h-13` |

### 1.3 SectionHeader 微调

**文件**: `client/src/components/ui/SectionHeader.tsx`
- `tracking-[0.08em]` → `tracking-widest`
- 确认 `text-sm` 不变

---

## Step 2: P0 — 随机浏览空状态重新设计

**文件**: `client/src/pages/RandomPage.tsx`

### 当前
大片黑色空白 + 居中 BatchSelector，无引导文字。

### 改后
在 BatchSelector 上方添加引导元素：

```
居中 flex-col items-center gap-6

├─ ImageIcon (lucide-react)  w-16 h-16 text-text-muted/30
├─ 标题  text-xl text-text-secondary "随机浏览你的照片"
├─ 说明  text-sm text-text-muted "选择一个批次大小，随机抽取照片进行审阅"
└─ BatchSelector (保持现有交互)
```

---

## Step 3: P1 — 网格卡片边界感

**文件**: `client/src/pages/GridPage.tsx`

### 照片卡片
- 添加 `border border-border/20 rounded-xl`
- hover 状态：`hover:border-border/40`
- 使用 `shadow-card` token

### 日期分组标题
- 底部添加 `border-b border-border/20`
- 调整 padding 为 `px-8 pb-4 pt-6`

---

## Step 4: P1 — 侧边栏间距与层级

**文件**: GridDateSidebar.tsx, DateSidebar.tsx

### 分组分隔
- "全部照片" 按钮与月份列表之间：添加 `<div className="border-b border-border/20 my-2" />`
- 月份标题增加 `pb-1` 间距

### 选中状态增强
- hover：`hover:bg-accent-subtle/50`（添加到非 active 项）

---

## Step 5: P1 — 胶片条改进

**文件**: `client/src/components/review/Filmstrip.tsx`, `client/src/styles/index.css`

| 属性 | 当前 | 改后 |
|---|---|---|
| 容器高度 | `h-[72px]` | `h-[88px]` |
| 缩略图尺寸 | `w-14 h-14` (56px) | `w-[72px] h-[72px]` |
| 选中项指示 | `border-2 border-accent scale-105` + CSS 三角 | `ring-2 ring-accent ring-offset-1 ring-offset-bg-deep scale-105` |

同时移除 `index.css` 中 `.filmstrip-item-active::before` 的 CSS 三角指示器（改为 ring 后视觉冲突）。

---

## Step 6: P2 — 工具栏分区与间距

**文件**: GridToolbar.tsx, ReviewToolbar.tsx, RandomToolbar.tsx

### 分隔符
在功能组之间添加竖线分隔符：
```tsx
<div className="w-px h-6 bg-border/40 mx-2" />
```

### 各页面分组

**GridToolbar**: 侧边栏切换+标题 | 照片计数+子文件夹 | 列数选择
**ReviewToolbar**: 文件名 | 进度条+过滤器 | 计数器+切换
**RandomToolbar**: 文件名 | 批次计数+缓存 | 面板切换

---

## Step 7: P2 — 详情面板文字

**文件**: `client/src/components/review/PhotoDetailsView.tsx`

### MetaRow 调整
- 标签：保持 `text-sm text-text-muted`
- 值：`text-base text-text` → `text-sm font-medium text-text`
- 最大宽度：`max-w-[220px]` → `max-w-[260px]`（给值更多空间）

### SectionHeader 内边距
- `px-4 py-3.5` → `px-5 py-3`

---

## Step 8: P3 — 首页品牌增强

**文件**: `client/src/pages/HomePage.tsx`

### 装饰元素
- 三圆点放大：`w-1.5 h-1.5` → `w-2 h-2`，间距 `gap-2` → `gap-3`
- 添加渐变光晕背景：`absolute w-[600px] h-[300px] bg-accent/[0.03] rounded-full blur-[100px]` 居中于标题区域
- 分隔线加长：`w-16` → `w-24`

### 次要按钮增强
- "浏览" 按钮 hover：添加 `hover:text-accent hover:border-accent/40`

---

## 提交计划

| 提交 | 内容 | 涉及文件 |
|---|---|---|
| P0 | Token 扩展 + 排版统一 + 空状态 | index.css, GridDateSidebar, DateSidebar, GridToolbar, ReviewToolbar, RandomToolbar, SectionHeader, RandomPage |
| P1 | 网格卡片 + 侧边栏分隔 + 胶片条 | GridPage, GridDateSidebar, DateSidebar, Filmstrip |
| P2 | 工具栏分区 + 详情面板 | GridToolbar, ReviewToolbar, RandomToolbar, PhotoDetailsView, SectionHeader |
| P3 | 首页品牌增强 | HomePage |

## 验证方式

每步提交后：
1. `npm run dev` 启动开发服务器
2. 逐页面检查排版、间距、边界效果
3. 对比优化前截图（`screenshots/` 目录）
4. `npm run test:e2e` 确保 E2E 测试通过
5. 使用 Playwright MCP 截图验证最终效果
