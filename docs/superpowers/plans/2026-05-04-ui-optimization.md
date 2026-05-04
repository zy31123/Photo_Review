# UI 优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 系统性优化 4 个页面的排版层级、视觉边界、空状态和品牌感

**Architecture:** Token-first — 先扩展 @theme token（阴影、清理未用 token），再按 P0→P3 四步逐步修改组件样式。每步独立提交。

**Tech Stack:** React 19, Tailwind CSS v4, TypeScript, lucide-react

**Design Spec:** `docs/superpowers/specs/2026-05-04-ui-optimization-design.md`

---

## File Map

| 操作 | 文件 | 职责 |
|---|---|---|
| Modify | `client/src/styles/index.css` | 添加阴影 token、清理未用 token、移除 CSS 三角 |
| Modify | `client/src/components/grid/GridDateSidebar.tsx` | 统一排版、添加分隔线、增强 hover |
| Modify | `client/src/components/review/DateSidebar.tsx` | 统一排版、添加分隔线、增强 hover |
| Modify | `client/src/components/grid/GridToolbar.tsx` | 高度统一、添加分隔符 |
| Modify | `client/src/components/review/ReviewToolbar.tsx` | 高度统一、添加分隔符 |
| Modify | `client/src/components/random/RandomToolbar.tsx` | 高度统一、添加分隔符 |
| Modify | `client/src/components/ui/SectionHeader.tsx` | tracking 调整 |
| Modify | `client/src/pages/RandomPage.tsx` | 空状态重新设计 |
| Modify | `client/src/pages/GridPage.tsx` | 照片卡片边框/阴影 |
| Modify | `client/src/components/review/Filmstrip.tsx` | 增大缩略图、改用 ring |
| Modify | `client/src/components/review/PhotoDetailsView.tsx` | MetaRow 字号调整 |
| Modify | `client/src/pages/HomePage.tsx` | 品牌增强 |

---

## Task 1: P0 — Token 扩展 + 排版统一 + 空状态

### Step 1.1: 扩展 @theme token 和清理

**File:** `client/src/styles/index.css`

- [ ] **修改 @theme 块（行 3-29）**

在 `--color-text-caption: #7A7A7A;` 之后、`--font-display` 之前，添加阴影 token：

```css
  --color-text-caption: #7A7A7A;

  --shadow-card: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
  --shadow-raised: 0 4px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2);
  --shadow-overlay: 0 20px 60px rgba(0,0,0,0.5);

  --font-display: "Playfair Display", serif;
```

移除未使用的 token（行 15、25）：
```css
/* 删除行 15: */ --color-accent-glow: rgba(232, 168, 56, 0.15);
/* 删除行 25: */ --color-text-caption: #7A7A7A;
```

保留 `--color-bg-overlay`、`--color-border-faint`、`--color-danger-dim`、`--color-success-dim`。

- [ ] **移除 CSS 三角指示器（行 125-137）**

删除整个 `.filmstrip-item-active::before` 块（将在 P1 改用 ring）。

### Step 1.2: GridDateSidebar 排版统一

**File:** `client/src/components/grid/GridDateSidebar.tsx`

- [ ] **"全部照片" 单文件夹（行 76-84）**

将 `px-5 py-4 rounded-r text-xl` 改为 `px-5 py-4 rounded-r text-xl font-semibold`：

```tsx
          <button
            onClick={() => setSelectedDate(null)}
            className={`w-full text-left px-5 py-4 rounded-r text-xl font-semibold transition-all duration-200 ${
```

- [ ] **"全部照片" 多文件夹（行 48-57）**

将 `px-5 py-3 rounded-r text-base` 改为 `px-4 py-2.5 rounded-r text-sm font-semibold`：
```tsx
            <button
              onClick={() => setSubfolderFilter(null)}
              className={`w-full text-left px-4 py-2.5 rounded-r text-sm font-semibold transition-all duration-200 ${
```

- [ ] **子文件夹项（行 59-70）**

将 `px-5 py-3 rounded-r text-base` 改为 `px-4 py-2.5 rounded-r text-sm`：
```tsx
              <button
                key={sf.path}
                onClick={() => setSubfolderFilter(sf.path === subfolderFilter ? null : sf.path)}
                className={`w-full text-left px-4 py-2.5 rounded-r text-sm transition-all duration-200 flex items-center justify-between ${
```

- [ ] **月份标题（行 117）**

将 `text-sm font-semibold tracking-[0.1em]` 改为 `text-xs font-semibold tracking-widest`：
```tsx
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold tracking-widest uppercase text-text-muted hover:text-text-secondary transition-colors"
```

- [ ] **日期行（行 161）**

将 `pl-6 pr-4 py-3 text-base` 改为 `pl-5 pr-3 py-2.5 text-sm`：
```tsx
          className={`date-item w-full flex items-center justify-between pl-5 pr-3 py-2.5 text-sm rounded-r transition-all duration-200 ${
```

- [ ] **日期行计数（行 168）**

将 `text-text-muted text-sm` 改为 `text-text-muted text-xs`：
```tsx
        <span className="text-text-muted text-xs tabular-nums">{count}</span>
```

### Step 1.3: DateSidebar (Review) 排版统一

**File:** `client/src/components/review/DateSidebar.tsx`

- [ ] **移除容器 inline style（行 33）**

将 `style={{ paddingLeft: 12 }}` 移除：
```tsx
      <div className="h-full bg-bg-deep border-r border-border/30 flex flex-col overflow-hidden">
```

- [ ] **头部 padding 统一（行 34）**

将 `px-5 pt-4 pb-2` 改为 `px-4 pt-5 pb-3`：
```tsx
        <div className="px-4 pt-5 pb-3">
```

- [ ] **"全部照片" 多文件夹（行 39）**

将 `text-sm` 改为 `text-sm font-semibold`：
```tsx
              className={`w-full text-left px-4 py-2.5 rounded-r text-sm font-semibold transition-all duration-200 ${
```

- [ ] **"全部照片" 单文件夹（行 66）**

将 `text-lg` 改为 `text-xl font-semibold`：
```tsx
              className={`w-full text-left px-4 py-3 rounded-r text-xl font-semibold transition-all duration-200 ${
```

- [ ] **月份标题（行 109）**

将 `text-sm font-semibold tracking-[0.08em]` 改为 `text-xs font-semibold tracking-widest`：
```tsx
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold tracking-widest uppercase text-text-muted hover:text-text-secondary transition-colors"
```

- [ ] **日期行（行 168）**

将 `pl-5 pr-3 py-3 text-base` 改为 `pl-5 pr-3 py-2.5 text-sm`：
```tsx
            className={`date-item w-full flex items-center justify-between pl-5 pr-3 py-2.5 text-sm rounded-r transition-all duration-200 ${rowClass}`}
```

- [ ] **日期行计数（行 171）**

将 `text-sm` 改为 `text-xs`：
```tsx
            <span className={`relative z-10 text-xs tabular-nums ${countColor}`}>
```

- [ ] **滚动区域 padding 统一（行 78）**

将 `px-4 pb-4` 改为 `px-3 pb-6`：
```tsx
        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
```

### Step 1.4: 工具栏高度统一

- [ ] **GridToolbar.tsx 行 12**

将 `h-14` 改为 `h-13`：
```tsx
      <div className="h-13 bg-bg-deep border-b border-border/30 flex items-center px-6 shrink-0">
```

- [ ] **ReviewToolbar.tsx 行 18**

将 `h-12` 改为 `h-13`：
```tsx
      <div className="h-13 bg-bg-deep border-b border-border/30 flex items-center px-4 shrink-0">
```

- [ ] **RandomToolbar.tsx 行 19**

将 `h-12` 改为 `h-13`：
```tsx
      <div className="h-13 bg-bg-deep border-b border-border/30 flex items-center px-4 shrink-0">
```

### Step 1.5: SectionHeader tracking 调整

**File:** `client/src/components/ui/SectionHeader.tsx`

- [ ] **行 3-4**

将 `tracking-[0.08em]` 改为 `tracking-widest`：
```tsx
    <div className="px-4 py-3.5 border-b border-border/30">
      <h3 className="text-sm font-semibold tracking-widest uppercase text-text-secondary font-body">
```

### Step 1.6: 随机浏览空状态重新设计

**File:** `client/src/pages/RandomPage.tsx`

- [ ] **添加 ImageIcon 导入（行 1）**

在现有 import 行添加：
```tsx
import { Image as ImageIcon } from 'lucide-react'
```

- [ ] **替换 BatchSelector 为增强空状态（行 73-80）**

将 `: <BatchSelector` 部分改为：
```tsx
      : <div className="flex flex-col items-center justify-center gap-6">
          <ImageIcon className="w-16 h-16 text-text-muted/30" />
          <div className="text-center">
            <p className="text-xl text-text-secondary mb-2">随机浏览你的照片</p>
            <p className="text-sm text-text-muted">选择一个批次大小，随机抽取照片进行审阅</p>
          </div>
          <BatchSelector
            batchSize={batch.batchSize}
            onBatchSizeChange={batch.changeBatchSize}
            onStart={handleStart}
            loading={batch.loading}
            exhausted={batch.exhausted}
            sessionReviewed={batch.sessionReviewed}
          />
        </div>
```

### Step 1.7: 验证 P0

- [ ] **启动开发服务器验证**

Run: `npm run dev`

逐页面检查：
1. 首页 — 无变化预期
2. /grid — 侧边栏排版是否统一（"全部照片" font-semibold，月份 xs/widest，日期 text-sm）
3. /review — 侧边栏与 grid 一致，工具栏高度 h-13
4. /random — 空状态有图标和引导文字

- [ ] **运行 E2E 测试**

Run: `npm run test:e2e`
Expected: 全部通过

- [ ] **提交 P0**

```bash
git add -A
git commit -m "style: P0 — 统一排版层级、工具栏高度，优化随机浏览空状态"
```

---

## Task 2: P1 — 网格卡片 + 侧边栏分隔 + 胶片条

### Step 2.1: 网格照片卡片边界感

**File:** `client/src/pages/GridPage.tsx`

- [ ] **照片卡片添加 border（行 123-144）**

将卡片 div（行 123）从：
```tsx
                          className="relative group cursor-pointer overflow-hidden rounded-xl"
```
改为：
```tsx
                          className="relative group cursor-pointer overflow-hidden rounded-xl border border-border/20 hover:border-border/40 transition-colors duration-200"
```

- [ ] **日期分组标题添加底部分隔线（行 92）**

将 `px-8 pb-3 pt-6` 改为 `px-8 pb-4 pt-6` 并在父 div 添加 `border-b border-border/20`：
```tsx
                      className="flex items-end px-8 pb-4 pt-6 border-b border-border/20"
```

### Step 2.2: 侧边栏分组分隔

**File:** `client/src/components/grid/GridDateSidebar.tsx`

- [ ] **"全部照片" 与月份列表之间添加分隔线**

在行 86 `</div>` (header 区结束) 之后、行 88 `<div className="flex-1...` 之前，添加分隔线：

将头部区域（行 44-86）的 `</div>` 和滚动区域之间插入：
```tsx
      <div className="border-b border-border/20 my-2" />

      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1.5">
```

**File:** `client/src/components/review/DateSidebar.tsx`

- [ ] **同样的分隔线**

在行 76 `</div>` (header 区结束) 和行 78 `<div className="flex-1...` 之间插入：
```tsx
      <div className="border-b border-border/20 my-2" />

      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
```

### Step 2.3: 侧边栏 hover 增强

**File:** `client/src/components/grid/GridDateSidebar.tsx`

- [ ] **非 active 项添加 hover 背景色**

"全部照片" 单文件夹（行 76-84）— inactive 状态改为：
```tsx
                : 'text-text-secondary hover:text-text hover:bg-accent-subtle/50 hover:bg-bg-raised'
```

注意：保持 `hover:bg-bg-raised` 不变，这里只是记录 hover 增强。实际上 `hover:bg-bg-raised` 已经足够。跳过此步。

### Step 2.4: 胶片条改进

**File:** `client/src/components/review/Filmstrip.tsx`

- [ ] **容器高度增大（行 26）**

将 `h-[72px]` 改为 `h-[88px]`：
```tsx
      <div className="h-[88px] bg-bg-deep border-t border-border/30 flex items-center px-4 overflow-hidden">
```

- [ ] **截断指示器尺寸增大（行 29、46）**

将 `w-14 h-14` 改为 `w-[72px] h-[72px]`：
```tsx
          <div className="flex-shrink-0 w-[72px] h-[72px] flex items-center justify-center text-[10px] text-text-muted">
```

- [ ] **缩略图尺寸增大（行 68）**

将 `w-14 h-14` 改为 `w-[72px] h-[72px]`：
```tsx
          className={`relative flex-shrink-0 w-[72px] h-[72px] rounded overflow-hidden transition-all duration-150 ${
```

- [ ] **选中项改用 ring（行 70-73）**

将 `border-2 border-accent scale-105 z-10 filmstrip-item-active` 改为：
```tsx
          ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-deep scale-105 z-10'
```

将非 active 的 `border-2 border-transparent` 改为 `border-2 border-transparent`（保持不变，ring 和 border 不冲突）。

实际上改用 ring 后，border-2 可以保留作为空间占位。保持非 active 项的 border-2 不变。

完整 active 条件：
```tsx
        active
          ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-deep scale-105 z-10'
          : reviewed
            ? 'border-2 border-transparent opacity-40 hover:opacity-70'
            : 'border-2 border-transparent opacity-50 hover:opacity-80'
```

### Step 2.5: 验证 P1

- [ ] **启动开发服务器验证**

Run: `npm run dev`

检查：
1. /grid — 照片卡片有淡边框，hover 时边框加深；日期标题有底部分隔线
2. /grid — 侧边栏"全部照片"与日期列表之间有分隔线
3. /review — 同样的侧边栏分隔线
4. /review — 胶片条更高，缩略图更大，选中项有 ring 指示

- [ ] **运行 E2E 测试**

Run: `npm run test:e2e`
Expected: 全部通过

- [ ] **提交 P1**

```bash
git add -A
git commit -m "style: P1 — 网格卡片边框、侧边栏分隔线、胶片条增大"
```

---

## Task 3: P2 — 工具栏分区 + 详情面板

### Step 3.1: GridToolbar 分区

**File:** `client/src/components/grid/GridToolbar.tsx`

- [ ] **在侧边栏按钮+标题和列数选择器之间添加分隔符**

在行 27（标题区结束）和行 29（列数选择器开始）之间添加分隔符。

将：
```tsx
      </div>

      <div className="ml-auto flex items-center gap-1">
```

改为：
```tsx
      </div>

      <div className="w-px h-6 bg-border/40" />

      <div className="ml-auto flex items-center gap-1">
```

### Step 3.2: ReviewToolbar 分区

**File:** `client/src/components/review/ReviewToolbar.tsx`

- [ ] **在文件名和进度条之间添加分隔符**

在行 24（文件名区结束）和行 27（右侧控件开始）之间：

将：
```tsx
      </div>

      {/* Right: progress + filter + counter + toggles */}
      <div className="flex items-center gap-4">
```

改为：
```tsx
      </div>

      <div className="w-px h-6 bg-border/40" />

      {/* Right: progress + filter + counter + toggles */}
      <div className="flex items-center gap-4">
```

### Step 3.3: RandomToolbar 分区

**File:** `client/src/components/random/RandomToolbar.tsx`

- [ ] **在文件名和右侧控件之间添加分隔符**

在行 24（文件名区结束）和行 26（右侧控件开始）之间：

将：
```tsx
      </div>

      <div className="flex items-center gap-4">
```

改为：
```tsx
      </div>

      <div className="w-px h-6 bg-border/40" />

      <div className="flex items-center gap-4">
```

- [ ] **面板切换按钮去除双重间距（行 51）**

将 `border-l border-border/30 ml-4 pl-4` 改为简化版：
```tsx
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
```

然后在按钮前（行 49 之前）添加分隔符：
```tsx
        <div className="w-px h-6 bg-border/40" />

        <button
```

### Step 3.4: 详情面板文字调整

**File:** `client/src/components/review/PhotoDetailsView.tsx`

- [ ] **MetaRow 值字号（行 113）**

将 `text-base text-text text-right max-w-[220px]` 改为 `text-sm font-medium text-text text-right max-w-[260px]`：
```tsx
      <span className={`text-sm font-medium text-text text-right max-w-[260px] break-all ${mono ? 'font-mono' : ''}`} title={value}>
```

注意：`font-medium` 和 `font-mono` 不会冲突，因为 `font-mono` 只改变字体族。

- [ ] **StatusBadge 字号统一（行 123、132）**

将 `text-base` 改为 `text-sm font-medium`：
```tsx
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
```
```tsx
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted">
```

- [ ] **文件状态标签（行 57、72）**

将 `text-base` 改为 `text-sm font-medium`：
```tsx
          <span className={`text-sm font-medium ${photo.hasJpg ? 'text-success' : 'text-danger'}`}>
```
```tsx
          <span className={`text-sm font-medium ${photo.hasRaw ? 'text-success' : 'text-danger'}`}>
```

### Step 3.5: SectionHeader 内边距调整

**File:** `client/src/components/ui/SectionHeader.tsx`

- [ ] **行 3**

将 `px-4 py-3.5` 改为 `px-5 py-3`：
```tsx
    <div className="px-5 py-3 border-b border-border/30">
```

### Step 3.6: 验证 P2

- [ ] **启动开发服务器验证**

Run: `npm run dev`

检查：
1. 三个工具栏有竖线分隔符区分功能区域
2. 详情面板 MetaRow 值为 text-sm font-medium
3. SectionHeader 内边距为 px-5 py-3

- [ ] **运行 E2E 测试**

Run: `npm run test:e2e`
Expected: 全部通过

- [ ] **提交 P2**

```bash
git add -A
git commit -m "style: P2 — 工具栏分区竖线、详情面板字号优化"
```

---

## Task 4: P3 — 首页品牌增强

**File:** `client/src/pages/HomePage.tsx`

### Step 4.1: 装饰元素增强

- [ ] **圆点放大（行 37-41）**

将 `w-1.5 h-1.5` 和 `gap-2` 改为 `w-2 h-2` 和 `gap-3`：
```tsx
        <div className="flex items-center gap-3 mb-4">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <span className="w-2 h-2 rounded-full bg-accent/60" />
          <span className="w-2 h-2 rounded-full bg-accent/30" />
        </div>
```

- [ ] **分隔线加长（行 46）**

将 `w-16` 改为 `w-24`：
```tsx
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-accent to-transparent mb-4" />
```

- [ ] **增强渐变光晕（行 32）**

将 `w-[600px] h-[600px]` 改为 `w-[800px] h-[400px]`，`bg-accent/[0.03]` 改为 `bg-accent/[0.04]`：
```tsx
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-accent/[0.04] blur-[120px]" />
```

### Step 4.2: 次要按钮 hover 增强

- [ ] **"浏览" 按钮（行 59-64）**

在 `hover:bg-bg-hover hover:text-text hover:border-border-light` 后追加 accent hover：
```tsx
              className="px-5 py-4 rounded-lg border border-border text-text-secondary hover:bg-bg-hover hover:text-accent hover:border-accent/40 hover:shadow-inner transition-all duration-200 text-base"
```

### Step 4.3: 验证 P3

- [ ] **启动开发服务器验证**

Run: `npm run dev`

检查：
1. 首页圆点更大，间距更宽
2. 分隔线更长（w-24）
3. 光晕效果更明显
4. "浏览" 按钮 hover 时文字变为 accent 色

- [ ] **运行 E2E 测试**

Run: `npm run test:e2e`
Expected: 全部通过

- [ ] **提交 P3**

```bash
git add -A
git commit -m "style: P3 — 首页品牌增强，装饰元素和按钮 hover 优化"
```

---

## Task 5: 最终验证

- [ ] **全量 E2E 测试**

Run: `npm run test:e2e`
Expected: 全部通过

- [ ] **使用 Playwright MCP 截图对比**

启动 dev server 后，对 4 个页面分别截图，与 `screenshots/` 目录下优化前截图对比。

- [ ] **合并到 feat/ui-redesign 并推送**

```bash
# 所有 4 个提交已在当前分支
git log --oneline -4  # 确认 4 个提交
```
