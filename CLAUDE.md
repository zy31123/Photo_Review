# Claude 配置

## 语言

- 默认中文回复，除非用户明确要求英文。

## 技术栈

- 前端: React 19 + TypeScript, Vite 6, Tailwind 4, 以apple hig 风格为主
- 后端: Express 5 + TypeScript, better-sqlite3 (WAL)
- 图片: sharp (缩略图), exifr (EXIF)
- 测试: @playwright/test (e2e 截图测试)
- 架构: npm workspaces monorepo (client/ + server/)
- 端口: 前端 5173 → 代理 /api → 后端 3001

## 常用命令

- `npm run dev` — 同时启动前端+后端开发服务器
- `npm run dev:client` / `npm run dev:server` — 单独启动
- `npm run build` — 构建前后端
- `npm run test:e2e` — 运行 Playwright e2e 截图测试

## 自动化截图测试

- 工具: `@playwright/test` (Chromium only)
- 配置: 根目录 `playwright.config.ts`
- 测试目录: `e2e/`（每个页面一个 spec 文件）
- 截图保存: `e2e/screenshots/`（已在 .gitignore 中）
- 测试数据: 真实照片文件夹 `E:\Photos`（仅读取，不修改）
- 流程: Playwright 自动启动 `npm run dev` → 注入 localStorage 模拟最近文件夹 → 点击扫描 → 通过 NavBar 导航各页面 → 等待图片完全加载后截图
- 等待策略: `waitForPhotos`（缩略图 DOM + complete + networkidle）/ `waitForFullImage`（大图加载完成）
- 导航: 必须通过 NavBar 按钮做客户端跳转（`page.goto` 会丢失 React Context）

## 目录结构

```
client/src/     # 前端源码
  pages/        # 页面组件
  components/   # 通用组件 (grid/, ui/)
  hooks/        # 自定义 hooks
  context/      # React context
  api/          # API 调用层
server/src/     # 后端源码
  routes/       # API 路由
  services/     # 业务逻辑
  db/           # 数据库层
e2e/            # Playwright e2e 截图测试
  helpers.ts    # 共享工具函数
  *.spec.ts     # 每页面一个测试
docs/architecture/ # 架构文档
```

## 工作流

- 新功能前询问是否保存修改、新建分支。
- 3+ 独立子任务时建议多 agent 并行。
- 功能完成后提醒使用 `/code-review` 审查代码。

### 提交流程（用户发出提交指令时严格执行）

1. **按功能新建分支**：根据变更内容的功能类型，从当前 main 新建描述性分支（如 `feat/navbar-style`、`fix/lightbox-zoom`、`style/homepage-layout`）。
2. **在功能分支上提交**：将所有相关变更提交到该功能分支，自动生成提交描述。
3. **合并到 main**：将功能分支合并回 main 分支。
4. **提示推送**：合并完成后询问用户是否推送到远程仓库，不主动推送。

## 原则

- 最小可行产品：每步独立可运行、可验证，先核心后扩展。
- 最小改动：优先保留现有结构，避免过度重构。
- 不添加不必要的防御性逻辑，信任内部调用约定。
- 实现前先读现有代码，编辑优先于重写。
- 不重复读已读过的文件（除非可能已变化）。
- 跳过 >100KB 的文件（除非明确要求）。
- 方案失败时先诊断根因，不盲目重试。
- 无法解决时说明阻塞原因并建议下一步。

## 安全边界

- 不主动执行破坏性操作（删文件、删分支、force push），必须先确认。
- 不主动推送代码或创建 PR，必须先确认。
- 涉及敏感文件（.env、密钥、凭证）时提醒用户，不主动读取或提交。

## 输出风格

- 简洁：先结论/操作，再补充必要解释。
- 代码变更说明改了什么、为什么改，不做无变更总结。
- 无逢迎性开头和结尾。

## 架构文档

- 收到代码任务时，**第一步**先读 `docs/architecture/agent-index.md` 的任务路由表，按表定位文件。**禁止**用 Glob/Grep 全局搜索来发现文件结构。
- `agent-index.md` — 任务路由表 + 文件索引（每次任务必读）
- `guide.zh-CN.md` / `guide.en.md` — 详细架构参考（仅在需要了解数据模型、API 细节、设计决策时查阅，不要在任务开始时读）
- 新增文件/接口/模块职责变更时同步更新 agent-index.md。

## 其他

- 用户指令优先于本文件。
- 长会话时建议运行 /cost 监控缓存率。
- 切换到无关任务时建议新建会话。
