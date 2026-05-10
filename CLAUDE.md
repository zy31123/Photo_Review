# Claude 配置

## 语言

- 默认中文回复，除非用户明确要求英文。

## 技术栈

- 前端: React 19 + TypeScript, Vite 6, Tailwind 4
- 后端: Express 5 + TypeScript, better-sqlite3 (WAL)
- 图片: sharp (缩略图), exifr (EXIF)
- 测试: Playwright (E2E)
- 架构: npm workspaces monorepo (client/ + server/)
- 端口: 前端 5173 → 代理 /api → 后端 3001

## 常用命令

- `npm run dev` — 同时启动前端+后端开发服务器
- `npm run build` — 构建前后端
- `npm run test:e2e` — 运行 E2E 测试
- `npm run test:e2e:headed` — 有头模式运行 E2E 测试
- `npm run test:full` — 生成测试照片 → E2E → 报告

## 工作流

- 开始新功能前，询问是否保存当前修改、是否需要新建分支。
- 代码修改后，询问是否提交，自动生成提交描述。
- 3+ 个独立子任务时，建议启用多 agent 并行。
- 每次开发完新的功能后提醒我使用simplify优化代码，使用review自动审查新增代码
- 每次更改都提交到新的分支中，然后再合并，最后进行推送

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

维护 `docs/architecture/`，包含：
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
