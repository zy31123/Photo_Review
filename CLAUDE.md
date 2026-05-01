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

### 基础配置

- Base URL: `https://<immich-server>/api`
- 认证: API Key (Header `x-api-key` 或 Query `?apiKey=`)
- 官方 SDK: `@immich/sdk` — `init({ baseUrl, apiKey })`
- OpenAPI 规范: <https://github.com/immich-app/immich/blob/main/open-api/immich-openapi-specs.json>

### 核心端点

**浏览**

- `GET /timeline/buckets` — 按日期分组的时间桶列表 (支持 albumId/isFavorite/personId/tagId 过滤)
- `GET /timeline/bucket?timeBucket=YYYY-MM-DD` — 获取特定日期桶内资产 ID
- `GET /assets/{id}` — 资产详情 (withExif/withPeople/withStacked)
- `GET /assets/{id}/thumbnail?size=thumbnail|preview` — 缩略图
- `GET /assets/{id}/original` — 下载原始文件

**操作**

- `PUT /assets` — 批量更新 (isFavorite/rating/description/visibility)
- `DELETE /assets/{id}` — 删除资产
- `PUT /tags/{id}/assets` — 批量打标签
- `PUT /albums/assets` — 批量添加到相册

**搜索**

- `POST /search/metadata` — 元数据搜索 (评分/人物/标签/日期/设备/地理位置)
- `POST /search/smart` — 语义搜索 (CLIP 向量)
- `GET /search/person?name=` — 按名字搜索人物

**辅助**

- `GET /server/ping` — 心跳检测 (无需认证)
- `GET /server/version` — 版本信息

### 与本项目 API 的映射

| Photo_Review 内部 API | Immich API | 说明 |
| --- | --- | --- |
| `GET /api/photos` | `GET /timeline/bucket` | 照片列表 |
| `GET /api/photos/:id/thumbnail` | `GET /assets/{id}/thumbnail` | 缩略图 |
| `GET /api/photos/:id/full` | `GET /assets/{id}/original` | 全尺寸图 |
| `GET /api/photos/:id/exif` | `GET /assets/{id}` (+withExif) | EXIF |
| `DELETE /api/photos/:id` | `DELETE /assets/{id}` | 删除 |
| `GET /api/reviews/random` | `POST /search/metadata` | 随机审阅 |
| `GET /api/stats` | `GET /server/statistics` | 统计 |

## 其他

- 用户指令优先于本文件。
- 长会话时建议运行 /cost 监控缓存率。
- 切换到无关任务时建议新建会话。
