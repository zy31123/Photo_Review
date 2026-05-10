# Claude 配置

## 语言

- 默认中文回复，除非用户明确要求英文。

## 技术栈

- 前端: React 19 + TypeScript, Vite 6, Tailwind 4
- 后端: Express 5 + TypeScript, better-sqlite3 (WAL)
- 图片: sharp (缩略图), exifr (EXIF)
- 测试: Playwright (E2E)    测试图片目录与截图输出见 `e2e/` 配置
- 架构: npm workspaces monorepo (client/ + server/)
- 端口: 前端 5173 → 代理 /api → 后端 3001

## 常用命令

### 开发

- `npm run dev` — 同时启动前端+后端开发服务器
- `npm run dev:client` / `npm run dev:server` — 单独启动
- `npm run build` — 构建前后端

### 测试

- `npm run test:e2e` — 运行 E2E 测试
- `npm run test:e2e:headed` — 有头模式运行 E2E 测试
- `npm run test:photos` — 生成测试照片
- `npm run test:full` — 生成测试照片 → E2E → 报告
- `npm run test:visual` — 视觉回归测试
- `npm run test:visual-full` — 完整视觉测试流程
- `npm run test:report` — 生成测试报告

### 截图

- `npm run screenshot` — 全页面截图
- `npm run screenshot:close` — 截图并关闭

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
e2e/            # Playwright E2E 测试
  fixtures/     # 测试照片生成
  tests/        # 测试用例
docs/architecture/ # 架构文档
```

## 工作流

- 新功能前询问是否保存修改、新建分支。
- 修改后询问是否提交，自动生成提交描述。
- 3+ 独立子任务时建议多 agent 并行。
- 功能完成后提醒使用 `/simplify` 优化、`/review` 审查代码。
- 更改提交到新分支后合并，推送前确认。

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

自动维护 `docs/architecture/`，包含：
- `agent-index.md` — Agent 路由索引
- `guide.zh-CN.md` — 中文架构说明
- `guide.en.md` — 英文架构说明

阅读源码前先看 ``docs/architecture/agent-index.md`，如果不存在，则提醒我初始化文档。新增文件/接口/模块职责变更时同步更新。

## Immich API 参考

集成 Immich 照片库时的 API 参考。完整文档: <https://api.immich.app/>

## 其他

- 用户指令优先于本文件。
- 长会话时建议运行 /cost 监控缓存率。
- 切换到无关任务时建议新建会话。
