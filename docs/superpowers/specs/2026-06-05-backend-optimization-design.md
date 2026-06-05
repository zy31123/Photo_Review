# 后端服务全面优化设计

> 日期: 2026-06-05
> 状态: 已批准，待实施

## Context

Photo Review 后端（Express 5 + better-sqlite3）当前功能完整，但存在以下问题：
- `routes/index.ts` 单文件 399 行 / 18 端点，`getPhotoById+404` 重复 4 次，每个 handler 手写 try/catch
- `scanner.ts` 全程同步 I/O，大文件夹阻塞事件循环
- `similarity.ts` 顺序 await 计算哈希，无并行
- 缩略图仅内存 LRU 缓存，重启丢失，RAW 文件每次重算
- EXIF 提取 `readFileSync` 读取整个 RAW 文件到内存（可能 50MB+）
- 无统一错误处理、无输入校验、无数据库迁移机制

**使用场景：** 典型文件夹几千张照片，最大不超过上万张。

## 目标结构

```
server/src/
  index.ts                  # Express 入口（精简，killPortOccupant 提取出去）
  utils/
    path.ts                 # 不变
    cleanupPort.ts          # 从 index.ts 提取的端口清理逻辑
  middleware/
    errorHandler.ts         # 统一错误 → JSON 响应
    validate.ts             # zod schema 校验中间件
    loadPhoto.ts            # param(:id) → photo 查找 + 404
  routes/
    index.ts                # 路由注册入口（挂载子路由）
    folders.ts              # GET browse, POST scan, GET subfolders
    photos.ts               # GET list, GET :id/thumbnail, GET :id/full, GET :id/exif, DELETE :id
    reviews.ts              # POST reviews, GET random, GET random/batch
    similarity.ts           # POST analyze, GET groups, GET stats
    settings.ts             # GET settings, PUT settings
    batch.ts                # GET orphaned, POST orphaned
  services/                 # 保持 6 个文件不变，内部优化
    scanner.ts              # 异步化 fs.promises
    image.ts                # 委托给 thumbnailCache
    exif.ts                 # 流式读取 + 缓存
    review.ts               # 不变
    similarity.ts           # 并行哈希 (p-limit)
    deleter.ts              # 不变
  cache/
    thumbnailCache.ts       # 内存 LRU + 磁盘双层缓存
    exifCache.ts            # EXIF 结果内存 LRU 缓存
  db/
    index.ts                # 简单版本迁移机制
    migrations.ts           # 迁移定义数组
```

## 一、路由拆分 + 中间件层

### 1.1 错误处理中间件 (`middleware/errorHandler.ts`)

自定义错误类：
```typescript
class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}
class NotFoundError extends AppError {
  constructor(message = '资源不存在') { super(404, message) }
}
class ForbiddenError extends AppError {
  constructor(message = '不允许访问') { super(403, message) }
}
class ValidationError extends AppError {
  constructor(message: string) { super(400, message) }
}
```

全局错误中间件（注册在所有路由之后）：
```typescript
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message })
  } else {
    console.error('[server] 未处理错误:', err)
    res.status(500).json({ message: '服务器内部错误' })
  }
}
```

### 1.2 输入校验中间件 (`middleware/validate.ts`)

使用 zod 定义 schema，中间件自动校验 `req.query` / `req.body` / `req.params`：

```typescript
import { z, ZodSchema } from 'zod'

export function validate<T extends ZodSchema>(schema: T, source: 'query' | 'body' | 'params' = 'query') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      throw new ValidationError(result.error.issues.map(i => i.message).join('; '))
    }
    req[source] = result.data
    next()
  }
}
```

使用示例：
```typescript
const folderQuery = z.object({ folder: z.string().min(1, '缺少 folder 参数') })
router.get('/stats', validate(folderQuery), (req, res) => { ... })
```

### 1.3 loadPhoto 中间件 (`middleware/loadPhoto.ts`)

消除 4 处重复的 `getPhotoById + 404` 模式：

```typescript
export const loadPhoto = (req: Request, _res: Response, next: NextFunction) => {
  const photo = getPhotoById(req.params.id)
  if (!photo) throw new NotFoundError('照片不存在')
  req.photo = photo
  next()
}
```

需要扩展 Express Request 类型：
```typescript
declare global {
  namespace Express {
    interface Request {
      photo?: import('../services/scanner.js').PhotoGroup
    }
  }
}
```

### 1.4 asyncHandler 包装

消除每个 handler 的 try/catch：

```typescript
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
```

### 1.5 路由拆分映射

| 文件 | 端点 | 数量 |
|------|------|------|
| `routes/folders.ts` | GET browse, POST scan, GET subfolders | 3 |
| `routes/photos.ts` | GET /, GET :id/thumbnail, GET :id/full, GET :id/exif, DELETE :id | 5 |
| `routes/reviews.ts` | POST /, GET random, GET random/batch | 3 |
| `routes/similarity.ts` | POST analyze, GET groups, GET stats | 3 |
| `routes/settings.ts` | GET /, PUT / | 2 |
| `routes/batch.ts` | GET orphaned, POST orphaned | 2 |

`routes/index.ts` 只做挂载：
```typescript
import { Router } from 'express'
import folders from './folders.js'
import photos from './photos.js'
// ...

const router = Router()
router.use('/folders', folders)
router.use('/photos', photos)
router.use('/reviews', reviews)
router.use('/similarity', similarity)
router.use('/settings', settings)
router.use('/batch', batch)
export default router
```

## 二、服务层性能优化

### 2.1 scanner.ts — 异步化

将所有 `fs.*Sync` 替换为 `fs.promises.*`：
- `fs.readdirSync` → `await fs.promises.readdir`
- `fs.statSync` → `await fs.promises.stat`
- `fs.existsSync` → `await fs.promises.access` 或 `fs.existsSync`（existsSync 轻量可保留）
- `fs.realpathSync` → `await fs.promises.realpath`

`scanFolder` 签名变为 `async`：
```typescript
export async function scanFolder(folderPath: string): Promise<ScanResult> { ... }
```

### 2.2 similarity.ts — 并行哈希

引入 `p-limit`，控制并发为 4（避免 sharp 内存爆炸）：

```typescript
import pLimit from 'p-limit'

const limit = pLimit(4)

// 在 analyzeFolder 中：
await Promise.all(photos.map(photo => limit(async () => {
  // computeDHash + insertStmt.run
  onProgress?.(++processed, total)
})))
```

SSE 进度回调在 `limit` 内部调用，确保实时更新。

### 2.3 双层缩略图缓存 (`cache/thumbnailCache.ts`)

**策略：** 内存 LRU → 磁盘 → sharp 生成

```
请求 → 内存命中? → 返回
       ↓ 否
     磁盘命中? → 写入内存 + 返回
       ↓ 否
     sharp 生成 → 写入磁盘 + 写入内存 + 返回
```

磁盘路径：`server/data/thumbnails/{photoId}.jpg`

内存 LRU：复用现有 Map 手动实现（上限 500），与当前逻辑一致。

磁盘缓存无 TTL，因为 photoId = MD5(路径)，同一照片的缩略图不变。文件夹重新扫描时不需要清理（旧 ID 自然不再被请求）。

清理策略：可选，启动时检查 `server/data/thumbnails/` 大小，超过 500MB 则按 atime 清理最旧的文件。

### 2.4 EXIF 缓存 + 流式读取

**缓存 (`cache/exifCache.ts`)：**
- 内存 LRU，上限 200 条
- key = photoId
- EXIF 数据很小（~200 字节/条），200 条仅 ~40KB

**部分读取 (`services/exif.ts`)：**
- `exifr.parse()` 支持 Buffer 输入，改为只读取文件前 256KB
- JPG 的 EXIF 数据在文件头部（前几 KB），256KB 足够
- CR3 基于 ISOBMFF 容器，EXIF 偏移可能较大，256KB 提供充足余量
- 对于 NEF/CR2 等经典 TIFF 结构同样足够
```typescript
const handle = await fs.promises.open(sourcePath, 'r')
const buf = Buffer.alloc(256 * 1024)
await handle.read(buf, 0, buf.length, 0)
await handle.close()
const data = await exifr.parse(buf, { pick: [...] })
```

这样对于 50MB 的 RAW 文件，只读取前 256KB，内存占用从 MB 级降至 KB 级。

## 三、基础设施层

### 3.1 数据库迁移 (`db/migrations.ts`)

```typescript
export const migrations = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS review_records (...);
      CREATE INDEX IF NOT EXISTS idx_review_records_cache ON review_records(cache_until);
      CREATE TABLE IF NOT EXISTS settings (...);
      CREATE TABLE IF NOT EXISTS photo_hashes (...);
    `,
  },
]
```

`db/index.ts` 中：
```typescript
function runMigrations(db: Database) {
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY)')
  const { v } = db.prepare('SELECT COALESCE(MAX(version), 0) as v FROM _migrations').get() as { v: number }
  for (const m of migrations) {
    if (m.version > v) {
      db.exec(m.up)
      db.prepare('INSERT INTO _migrations (version) VALUES (?)').run(m.version)
    }
  }
}
```

现有的 `initSchema` 内容迁移到 `migrations[0].up`，保持向前兼容。

### 3.2 入口精简

`index.ts` 中 `killPortOccupant` 提取到 `utils/cleanupPort.ts`，入口文件只保留：
- CORS 配置
- JSON 解析
- 路由挂载
- 错误中间件
- 监听启动

### 3.3 前端影响

API 端点路径和响应格式保持不变，前端 `client/src/api/index.ts` **不需要修改**。

## 四、新增依赖

| 包 | 用途 | 大小 |
|----|------|------|
| `zod` | 输入校验 schema | ~13KB gzipped |
| `p-limit` | 并发控制 | ~1KB gzipped |

## 五、关键设计决策

1. **不改变 service 文件数量** — 6 个 service 文件保持不变，内部优化。降低回归风险。
2. **双层缓存而非纯磁盘缓存** — 内存 LRU 命中零 I/O，磁盘作为二级兜底。
3. **简单迁移而非引入工具** — 手动 migrations 数组，无需 knex/umzug 等依赖。
4. **并发限制 4** — sharp 是 CPU+内存密集型，4 个并行平衡速度和资源。
5. **EXIF 只读 64KB** — EXIF 数据在文件头部，无需读取完整 RAW 文件。

## 六、验证方式

1. `npm run dev` 启动后，原有所有页面功能正常
2. 扫描文件夹 → 网格浏览 → 审阅 → 随机 → 相似分析全流程通过
3. 缩略图首次加载后重启服务，第二次应从磁盘缓存命中（无 sharp CPU 开销）
4. `npm run test:e2e` 全部通过
5. 检查 `server/data/thumbnails/` 目录生成缓存文件
