# Photo Review

本地照片审查工具，帮助快速浏览、筛选和管理照片库。采用暗房（Darkroom）主题设计。

## 功能

- **文件夹浏览** — 可视化选择本地照片目录，无需手动输入路径
- **批量审查** — 快速逐张浏览照片，标记保留或删除
- **随机浏览** — 随机抽取照片进行审查
- **审查记录** — SQLite 持久化记录每张照片的审查状态

## 技术栈

**前端：** React 19 + TypeScript + Vite + Tailwind CSS 4

**后端：** Express 5 + TypeScript + better-sqlite3 + Sharp

**架构：** npm workspaces monorepo

## 项目结构

```
Photo_Review/
├── client/          # React 前端 (Vite, port 5173)
│   └── src/
│       ├── pages/       # 四个核心页面
│       ├── components/  # UI 组件（FolderPicker 等）
│       ├── context/     # React Context
│       ├── hooks/       # 自定义 Hooks
│       └── api/         # 后端 API 调用
├── server/          # Express 后端 (port 3001)
│   └── src/
│       ├── routes/      # API 路由
│       ├── services/    # 业务逻辑（扫描/图片/删除/审查）
│       └── db/          # SQLite 数据库
└── package.json     # monorepo 根配置
```

## 环境要求

- Node.js = 22
- npm >= 9

## 快速开始

```bash
# 克隆项目
git clone https://github.com/zy31123/Photo_Review.git
cd Photo_Review

# 安装依赖
npm install

# 启动开发环境（前后端同时启动）
npm run dev
```

启动后访问 http://localhost:5173

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端开发服务器 |
| `npm run dev:client` | 仅启动前端 |
| `npm run dev:server` | 仅启动后端 |
| `npm run build` | 构建前后端生产版本 |

## 工作原理

1. 前端通过 `FolderPicker` 组件选择本地照片目录
2. 后端扫描目录中的图片文件，生成缩略图
3. 用户在审查页面逐张浏览，标记"保留"或"删除"
4. 审查记录保存在本地 SQLite 数据库中（`data/` 目录）
5. 删除操作将文件移至系统回收站，而非永久删除
