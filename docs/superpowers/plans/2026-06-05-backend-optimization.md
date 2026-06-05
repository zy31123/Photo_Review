# 后端服务全面优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构后端路由层、添加中间件抽象、优化服务层性能（异步扫描、并行哈希、双层缓存），提升代码结构和运行时表现。

**Architecture:** 路由从单文件拆分为 6 个领域文件，抽取错误处理/校验/照片加载为可复用中间件。服务层内部优化：scanner 异步化、similarity 并行化、缩略图和 EXIF 增加缓存层。数据库增加简单版本迁移。

**Tech Stack:** Express 5, better-sqlite3, sharp, exifr, zod (新增), p-limit (新增)

**Spec:** `docs/superpowers/specs/2026-06-05-backend-optimization-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `server/src/middleware/asyncHandler.ts` | async handler 包装，消除 try/catch |
| Create | `server/src/middleware/errorHandler.ts` | AppError 类 + 全局错误中间件 |
| Create | `server/src/middleware/validate.ts` | zod schema 校验中间件 |
| Create | `server/src/middleware/loadPhoto.ts` | photo 查找 + 404 + 类型扩展 |
| Create | `server/src/routes/folders.ts` | 文件夹相关 3 个端点 |
| Create | `server/src/routes/photos.ts` | 照片 CRUD 5 个端点 |
| Create | `server/src/routes/reviews.ts` | 审阅 3 个端点 |
| Create | `server/src/routes/similarity.ts` | 相似分析 3 个端点 |
| Create | `server/src/routes/settings.ts` | 设置 2 个端点 |
| Create | `server/src/routes/batch.ts` | 批量操作 2 个端点 |
| Create | `server/src/cache/thumbnailCache.ts` | 内存+磁盘双层缩略图缓存 |
| Create | `server/src/cache/exifCache.ts` | EXIF 结果内存缓存 |
| Create | `server/src/db/migrations.ts` | 迁移定义数组 |
| Create | `server/src/utils/cleanupPort.ts` | 端口清理逻辑 |
| Modify | `server/src/routes/index.ts` | 从 399 行路由 → 注册入口 |
| Modify | `server/src/db/index.ts` | 增加迁移机制 |
| Modify | `server/src/services/scanner.ts` | 异步化 fs.promises |
| Modify | `server/src/services/similarity.ts` | p-limit 并行哈希 |
| Modify | `server/src/services/image.ts` | 委托 thumbnailCache |
| Modify | `server/src/services/exif.ts` | 部分读取 + 缓存 |
| Modify | `server/src/index.ts` | 精简入口 |
| Modify | `server/package.json` | 添加 zod, p-limit |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Install zod and p-limit**

```bash
cd server && npm install zod p-limit && cd ..
```

- [ ] **Step 2: Verify installation**

Run: `cat server/package.json | grep -E '"zod"|"p-limit"'`

Expected: both packages listed in dependencies with version numbers.

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: add zod and p-limit dependencies for backend optimization"
```

---

## Task 2: Error Handling Foundation

**Files:**
- Create: `server/src/middleware/errorHandler.ts`
- Create: `server/src/middleware/asyncHandler.ts`

- [ ] **Step 1: Create error classes and global error middleware**

Create `server/src/middleware/errorHandler.ts`:

```typescript
import { type Request, type Response, type NextFunction } from 'express'

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(404, message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '不允许访问') {
    super(403, message)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message)
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message })
  } else {
    console.error('[server] 未处理错误:', err)
    res.status(500).json({ message: '服务器内部错误' })
  }
}
```

- [ ] **Step 2: Create asyncHandler wrapper**

Create `server/src/middleware/asyncHandler.ts`:

```typescript
import { type Request, type Response, type NextFunction } from 'express'

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd server && npx tsc --noEmit && cd ..`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/middleware/errorHandler.ts server/src/middleware/asyncHandler.ts
git commit -m "feat: add error handling foundation (AppError classes + asyncHandler)"
```

---

## Task 3: Validation and Photo Loading Middleware

**Files:**
- Create: `server/src/middleware/validate.ts`
- Create: `server/src/middleware/loadPhoto.ts`

- [ ] **Step 1: Create zod validation middleware**

Create `server/src/middleware/validate.ts`:

```typescript
import { type Request, type Response, type NextFunction } from 'express'
import { type ZodSchema } from 'zod'
import { ValidationError } from './errorHandler.js'

export function validate(schema: ZodSchema, source: 'query' | 'body' | 'params' = 'query') {
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

- [ ] **Step 2: Create loadPhoto middleware with Express type augmentation**

Create `server/src/middleware/loadPhoto.ts`:

```typescript
import { type Request, type Response, type NextFunction } from 'express'
import { getPhotoById, type PhotoGroup } from '../services/scanner.js'
import { NotFoundError } from './errorHandler.js'

declare global {
  namespace Express {
    interface Request {
      photo?: PhotoGroup
    }
  }
}

export function loadPhoto(req: Request, _res: Response, next: NextFunction): void {
  const photo = getPhotoById(req.params.id)
  if (!photo) throw new NotFoundError('照片不存在')
  req.photo = photo
  next()
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd server && npx tsc --noEmit && cd ..`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/middleware/validate.ts server/src/middleware/loadPhoto.ts
git commit -m "feat: add validate middleware (zod) and loadPhoto middleware"
```

---

## Task 4: Database Migration System

**Files:**
- Create: `server/src/db/migrations.ts`
- Modify: `server/src/db/index.ts`

- [ ] **Step 1: Create migrations definition**

Create `server/src/db/migrations.ts`:

```typescript
export const migrations = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS review_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        file_name TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('keep', 'deleted')),
        review_mode TEXT NOT NULL CHECK(review_mode IN ('sequential', 'random')),
        reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        cache_until DATETIME
      );

      CREATE INDEX IF NOT EXISTS idx_review_records_cache ON review_records(cache_until);

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS photo_hashes (
        file_path TEXT PRIMARY KEY,
        dhash TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        computed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
]
```

- [ ] **Step 2: Update db/index.ts to use migrations**

Replace `server/src/db/index.ts` with:

```typescript
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { migrations } from './migrations.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'photo-review.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    runMigrations(db)
  }
  return db
}

function runMigrations(db: Database.Database): void {
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY)')
  const { v } = db.prepare('SELECT COALESCE(MAX(version), 0) as v FROM _migrations').get() as { v: number }

  for (const m of migrations) {
    if (m.version > v) {
      db.exec(m.up)
      db.prepare('INSERT INTO _migrations (version) VALUES (?)').run(m.version)
    }
  }

  // Seed default settings if not present
  const row = db.prepare("SELECT value FROM settings WHERE key = 'random_cache_days'").get() as { value: string } | undefined
  if (!row) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('random_cache_days', '7')").run()
  }
}
```

- [ ] **Step 3: Verify the app still starts and DB initializes correctly**

Run: `cd server && npx tsx src/index.ts &` then `curl -s http://127.0.0.1:3001/api/settings`

Expected: `{"random_cache_days":"7"}`

Then kill the server process.

- [ ] **Step 4: Commit**

```bash
git add server/src/db/migrations.ts server/src/db/index.ts
git commit -m "feat: add database migration system with version tracking"
```

---

## Task 5: Cache Modules

**Files:**
- Create: `server/src/cache/thumbnailCache.ts`
- Create: `server/src/cache/exifCache.ts`

- [ ] **Step 1: Create dual-layer thumbnail cache**

Create `server/src/cache/thumbnailCache.ts`:

```typescript
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { type PhotoGroup } from '../services/scanner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = path.join(__dirname, '..', '..', 'data', 'thumbnails')
const THUMBNAIL_SIZE = 400
const MAX_MEMORY_CACHE = 500
const MAX_DISK_CACHE_MB = 500

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
}

// Memory LRU cache
const memoryCache = new Map<string, Buffer>()

function getDiskPath(photoId: string): string {
  return path.join(CACHE_DIR, `${photoId}.jpg`)
}

function evictMemoryCache(): void {
  if (memoryCache.size > MAX_MEMORY_CACHE) {
    const oldest = memoryCache.keys().next().value
    if (oldest !== undefined) memoryCache.delete(oldest)
  }
}

function cleanupDiskCache(): void {
  try {
    const entries = fs.readdirSync(CACHE_DIR)
      .map(name => ({
        name,
        path: path.join(CACHE_DIR, name),
        atime: fs.statSync(path.join(CACHE_DIR, name)).atimeMs,
      }))
      .sort((a, b) => a.atime - b.atime)

    let totalSize = 0
    for (const e of entries) {
      totalSize += fs.statSync(e.path).size
    }

    const maxBytes = MAX_DISK_CACHE_MB * 1024 * 1024
    let i = 0
    while (totalSize > maxBytes && i < entries.length) {
      const stat = fs.statSync(entries[i].path)
      fs.unlinkSync(entries[i].path)
      totalSize -= stat.size
      i++
    }
  } catch {
    // Silently ignore cleanup failures
  }
}

export async function getOrGenerateThumbnail(photo: PhotoGroup): Promise<Buffer | null> {
  const sourcePath = photo.jpgPath || photo.rawPaths[0]
  if (!sourcePath) return null

  // Layer 1: Memory cache
  const cached = memoryCache.get(photo.id)
  if (cached) {
    // LRU: move to end
    memoryCache.delete(photo.id)
    memoryCache.set(photo.id, cached)
    return cached
  }

  // Layer 2: Disk cache
  const diskPath = getDiskPath(photo.id)
  try {
    const diskBuf = fs.readFileSync(diskPath)
    memoryCache.set(photo.id, diskBuf)
    evictMemoryCache()
    return diskBuf
  } catch {
    // Not on disk, generate below
  }

  // Layer 3: Generate with sharp
  try {
    const buf = await sharp(sourcePath, { failOn: 'none' })
      .rotate()
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer()

    // Write to disk (fire-and-forget)
    try {
      fs.writeFileSync(diskPath, buf)
    } catch {
      // Disk write failure is non-critical
    }

    memoryCache.set(photo.id, buf)
    evictMemoryCache()

    return buf
  } catch {
    return null
  }
}

// Call disk cleanup once at startup
cleanupDiskCache()
```

- [ ] **Step 2: Create EXIF memory cache**

Create `server/src/cache/exifCache.ts`:

```typescript
import { type ExifData } from '../services/exif.js'

const MAX_CACHE = 200
const cache = new Map<string, ExifData>()

export function getCachedExif(photoId: string): ExifData | null {
  const cached = cache.get(photoId)
  if (cached) {
    // LRU: move to end
    cache.delete(photoId)
    cache.set(photoId, cached)
    return cached
  }
  return null
}

export function setCachedExif(photoId: string, data: ExifData): void {
  cache.set(photoId, data)
  if (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd server && npx tsc --noEmit && cd ..`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/cache/thumbnailCache.ts server/src/cache/exifCache.ts
git commit -m "feat: add dual-layer thumbnail cache and EXIF memory cache"
```

---

## Task 6: Split Routes — folders.ts

**Files:**
- Create: `server/src/routes/folders.ts`

- [ ] **Step 1: Create folders route**

Create `server/src/routes/folders.ts`:

```typescript
import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { z } from 'zod'
import { scanFolder } from '../services/scanner.js'
import { getSubfolders } from '../services/scanner.js'
import { resolveNormalized } from '../utils/path.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validate } from '../middleware/validate.js'
import { ForbiddenError } from '../middleware/errorHandler.js'

const BLOCKED_PREFIXES = [
  '/etc', '/usr', '/bin', '/sbin', '/var', '/System', '/Library',
  '/private/etc', '/private/var', '/dev', '/proc', '/sys',
  'C:/Windows', 'C:/Program Files', 'C:/Program Files (x86)', 'C:/ProgramData',
]

function isPathAllowed(p: string): boolean {
  const resolved = resolveNormalized(p).toLowerCase()
  return !BLOCKED_PREFIXES.some(prefix => resolved === prefix.toLowerCase() || resolved.startsWith(prefix.toLowerCase() + '/'))
}

function isWindowsDriveRoot(p: string): boolean {
  return process.platform === 'win32' && /^[A-Za-z]:\\$/.test(p)
}

let cachedDrives: string[] | null = null
let drivesCacheTime = 0
const DRIVES_CACHE_TTL = 30_000

function getWindowsDrives(): string[] {
  if (cachedDrives && Date.now() - drivesCacheTime < DRIVES_CACHE_TTL) return cachedDrives
  try {
    const result = execSync(
      'powershell -Command "Get-PSDrive -PSProvider FileSystem | Select-Object -ExpandProperty Root"',
      { encoding: 'utf-8', timeout: 5000 }
    )
    cachedDrives = result
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && /^[A-Za-z]:\\$/i.test(line))
    drivesCacheTime = Date.now()
    return cachedDrives
  } catch {
    return ['C:\\']
  }
}

function getMacVolumes(): { name: string; path: string }[] {
  const volumes: { name: string; path: string }[] = [
    { name: 'Macintosh HD (系统盘)', path: '/' },
  ]
  try {
    const entries = fs.readdirSync('/Volumes', { withFileTypes: true })
    for (const e of entries) {
      if (e.isDirectory() && e.name !== 'Macintosh HD') {
        volumes.push({ name: e.name, path: `/Volumes/${e.name}` })
      }
    }
  } catch {
    // /Volumes not accessible
  }
  return volumes
}

const router = Router()

// Browse directories
router.get('/browse', (req, res) => {
  const dir = req.query.path as string

  // Virtual root: list available drives/volumes
  if (dir === '') {
    if (process.platform === 'win32') {
      const drives = getWindowsDrives()
      return res.json({
        current: '',
        parent: null,
        children: drives.map(d => ({ name: d, path: d })),
      })
    } else {
      return res.json({
        current: '',
        parent: null,
        children: getMacVolumes(),
      })
    }
  }

  const targetDir = (dir || os.homedir()).replace(/[A-Za-z]:$/, '$&\\')

  if (!isPathAllowed(targetDir)) {
    throw new ForbiddenError('不允许访问此路径')
  }

  const stat = fs.statSync(targetDir)
  if (!stat.isDirectory()) {
    return res.status(400).json({ message: '不是文件夹' })
  }

  const entries = fs.readdirSync(targetDir, { withFileTypes: true })
  const children = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => ({
      name: e.name,
      path: path.join(targetDir, e.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

  const parent = path.dirname(targetDir)
  const effectiveParent = parent !== targetDir
    ? parent
    : (isWindowsDriveRoot(targetDir) || targetDir === '/' ? '' : null)

  res.json({
    current: targetDir,
    parent: effectiveParent,
    children,
  })
})

// Scan folder
const scanSchema = z.object({
  path: z.string().min(1, '缺少文件夹路径'),
})

router.post('/scan', validate(scanSchema, 'body'), asyncHandler(async (req, res) => {
  const { path: folderPath } = req.body
  if (!isPathAllowed(folderPath)) throw new ForbiddenError('不允许访问此路径')

  const result = await scanFolder(folderPath)
  res.json({
    total: result.total,
    paired: result.paired,
    orphanJpg: result.orphanJpg,
    orphanRaw: result.orphanRaw,
  })
}))

// Get subfolders
const subfolderSchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
})

router.get('/subfolders', validate(subfolderSchema), (req, res) => {
  res.json(getSubfolders(req.query.folder as string))
})

export default router
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/folders.ts
git commit -m "feat: extract folders routes into dedicated module"
```

---

## Task 7: Split Routes — photos.ts

**Files:**
- Create: `server/src/routes/photos.ts`

- [ ] **Step 1: Create photos route**

Create `server/src/routes/photos.ts`:

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { getPhotosForFolder, removePhoto } from '../services/scanner.js'
import { getReviewStatuses } from '../services/review.js'
import { getThumbnail, getFullImage, getImageMimeType } from '../services/image.js'
import { extractExif } from '../services/exif.js'
import { deletePhoto } from '../services/deleter.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validate } from '../middleware/validate.js'
import { loadPhoto } from '../middleware/loadPhoto.js'
import { NotFoundError } from '../middleware/errorHandler.js'

const router = Router()

// Get photos list
const photosQuerySchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  status: z.enum(['unreviewed', 'reviewed']).optional(),
  subfolder: z.string().optional(),
})

router.get('/', validate(photosQuerySchema), (req, res) => {
  const folder = req.query.folder as string
  const photos = getPhotosForFolder(folder)

  const filePaths = photos.map(p => p.jpgPath || p.rawPaths[0] || '')
  const reviewMap = getReviewStatuses(filePaths)

  const photosWithStatus = photos.map((p, i) => {
    const status = reviewMap.get(filePaths[i])
    return {
      ...p,
      reviewAction: status?.action || null,
      reviewedAt: status?.reviewedAt || null,
    }
  })

  const status = req.query.status as string | undefined
  const subfolder = req.query.subfolder as string | undefined
  let filtered = photosWithStatus
  if (subfolder) {
    filtered = filtered.filter(p => p.subfolder === subfolder)
  }
  if (status === 'unreviewed') {
    filtered = filtered.filter(p => !p.reviewAction)
  } else if (status === 'reviewed') {
    filtered = filtered.filter(p => p.reviewAction)
  }

  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 2000
  const start = (page - 1) * limit
  const paged = filtered.slice(start, start + limit)

  res.json({
    photos: paged,
    total: filtered.length,
  })
})

// Get thumbnail
router.get('/:id/thumbnail', loadPhoto, asyncHandler(async (req, res) => {
  const buf = await getThumbnail(req.photo!)
  if (!buf) throw new NotFoundError('无法生成缩略图')

  res.set('Content-Type', 'image/jpeg')
  res.set('Cache-Control', 'public, max-age=3600')
  res.send(buf)
}))

// Get full image
router.get('/:id/full', loadPhoto, asyncHandler(async (req, res) => {
  const data = await getFullImage(req.photo!)
  if (!data) throw new NotFoundError('无法读取图片')

  res.set('Content-Type', getImageMimeType(req.photo!))
  res.set('Cache-Control', 'public, max-age=86400')
  if (Buffer.isBuffer(data)) {
    res.send(data)
  } else {
    data.pipe(res)
  }
}))

// Get EXIF data
router.get('/:id/exif', loadPhoto, asyncHandler(async (req, res) => {
  const exif = await extractExif(req.photo!)
  if (!exif) return res.json(null)
  res.json(exif)
}))

// Delete photo
router.delete('/:id', loadPhoto, asyncHandler(async (req, res) => {
  const deleted = await deletePhoto(req.photo!)
  removePhoto(req.photo!.id)
  res.json({ success: true, deleted })
}))

export default router
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/photos.ts
git commit -m "feat: extract photos routes into dedicated module"
```

---

## Task 8: Split Routes — reviews.ts

**Files:**
- Create: `server/src/routes/reviews.ts`

- [ ] **Step 1: Create reviews route**

Create `server/src/routes/reviews.ts`:

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { getPhotoById } from '../services/scanner.js'
import { scanFolder } from '../services/scanner.js'
import { recordReview, getRandomUnreviewedPhoto, getRandomUnreviewedPhotos, getCacheDays } from '../services/review.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validate } from '../middleware/validate.js'
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js'
import { isPathAllowed } from './folders.js'
import { ForbiddenError } from '../middleware/errorHandler.js'

const router = Router()

// Submit review
const reviewSchema = z.object({
  photoId: z.string().min(1, '缺少 photoId'),
  action: z.enum(['keep', 'deleted'], { message: 'action 必须为 keep 或 deleted' }),
  mode: z.enum(['sequential', 'random'], { message: 'mode 必须为 sequential 或 random' }),
})

router.post('/', validate(reviewSchema, 'body'), (req, res) => {
  const { photoId, action, mode } = req.body

  const photo = getPhotoById(photoId)
  if (!photo) throw new NotFoundError('照片不存在')

  const filePath = photo.jpgPath || photo.rawPaths[0] || ''
  const cacheDays = mode === 'random' ? getCacheDays() : undefined
  recordReview(filePath, photo.name, action, mode, cacheDays)
  res.json({ success: true })
})

// Get random photo
const randomSchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
})

router.get('/random', validate(randomSchema), asyncHandler(async (req, res) => {
  const folder = req.query.folder as string
  if (!isPathAllowed(folder)) throw new ForbiddenError('不允许访问此路径')
  if (getPhotosForFolder(folder).length === 0) {
    await scanFolder(folder)
  }
  const photo = getRandomUnreviewedPhoto(folder)
  res.json(photo)
}))

// Import getPhotosForFolder for the random endpoints
import { getPhotosForFolder } from '../services/scanner.js'

// Get batch of random photos
const randomBatchSchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
  count: z.coerce.number().int().min(1).max(100).optional(),
})

router.get('/random/batch', validate(randomBatchSchema), asyncHandler(async (req, res) => {
  const folder = req.query.folder as string
  if (!isPathAllowed(folder)) throw new ForbiddenError('不允许访问此路径')
  const count = Math.min(Math.max(Number(req.query.count) || 20, 1), 100)
  if (getPhotosForFolder(folder).length === 0) {
    await scanFolder(folder)
  }
  const photos = getRandomUnreviewedPhotos(folder, count)
  res.json({ photos, total: photos.length })
}))

export default router
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/reviews.ts
git commit -m "feat: extract reviews routes into dedicated module"
```

---

## Task 9: Split Routes — similarity.ts

**Files:**
- Create: `server/src/routes/similarity.ts`

- [ ] **Step 1: Create similarity route**

Create `server/src/routes/similarity.ts`:

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { analyzeFolder, getSimilarGroups, getSimilarStats } from '../services/similarity.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validate } from '../middleware/validate.js'
import { ForbiddenError } from '../middleware/errorHandler.js'
import { isPathAllowed } from './folders.js'

const router = Router()

// Analyze folder for similar photos (SSE streaming progress)
const analyzeSchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
  timeGap: z.number().optional(),
  hashThreshold: z.number().optional(),
})

router.post('/analyze', validate(analyzeSchema, 'body'), async (req, res) => {
  const { folder, timeGap, hashThreshold } = req.body
  if (!isPathAllowed(folder)) throw new ForbiddenError('不允许访问此路径')

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const result = await analyzeFolder(folder, timeGap, hashThreshold, (current, total) => {
      send('progress', { current, total })
    })
    send('complete', result)
  } catch (e: any) {
    send('error', { message: e.message })
  }
  res.end()
})

// Get similar groups
const groupsSchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
  timeGap: z.coerce.number().optional(),
  hashThreshold: z.coerce.number().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
})

router.get('/groups', validate(groupsSchema), (req, res) => {
  const folder = req.query.folder as string
  if (!isPathAllowed(folder)) throw new ForbiddenError('不允许访问此路径')

  const timeGap = Number(req.query.timeGap) || undefined
  const hashThreshold = Number(req.query.hashThreshold) || undefined
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 50

  const groups = getSimilarGroups(folder, timeGap, hashThreshold)
  const start = (page - 1) * limit
  const paged = groups.slice(start, start + limit)

  res.json({ groups: paged, total: groups.length })
})

// Get similarity stats
const statsSchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
})

router.get('/stats', validate(statsSchema), (req, res) => {
  const folder = req.query.folder as string
  if (!isPathAllowed(folder)) throw new ForbiddenError('不允许访问此路径')

  const stats = getSimilarStats(folder)
  res.json(stats)
})

export default router
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/similarity.ts
git commit -m "feat: extract similarity routes into dedicated module"
```

---

## Task 10: Split Routes — settings.ts and batch.ts

**Files:**
- Create: `server/src/routes/settings.ts`
- Create: `server/src/routes/batch.ts`

- [ ] **Step 1: Create settings route**

Create `server/src/routes/settings.ts`:

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { getCacheDays, setCacheDays } from '../services/review.js'
import { validate } from '../middleware/validate.js'
import { ValidationError } from '../middleware/errorHandler.js'

const router = Router()

// Get settings
router.get('/', (_req, res) => {
  const cacheDays = getCacheDays()
  res.json({ random_cache_days: String(cacheDays) })
})

// Update settings
const settingsSchema = z.object({
  random_cache_days: z.string().optional(),
})

router.put('/', validate(settingsSchema, 'body'), (req, res) => {
  const { random_cache_days } = req.body
  if (random_cache_days) {
    const days = Number(random_cache_days)
    if (isNaN(days) || days < 1) throw new ValidationError('缓存天数必须为正整数')
    setCacheDays(days)
  }
  res.json({ success: true })
})

export default router
```

- [ ] **Step 2: Create batch route**

Create `server/src/routes/batch.ts`:

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { getPhotosForFolder } from '../services/scanner.js'
import { deleteOrphanedFiles } from '../services/deleter.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validate } from '../middleware/validate.js'
import { ValidationError } from '../middleware/errorHandler.js'

const router = Router()

// Get orphaned files
const orphanedQuerySchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
})

router.get('/orphaned', validate(orphanedQuerySchema), (req, res) => {
  const folder = req.query.folder as string
  const photos = getPhotosForFolder(folder)
  const jpg = photos.filter(p => p.orphanType === 'jpg')
  const raw = photos.filter(p => p.orphanType === 'raw')
  res.json({ jpg, raw })
})

// Delete orphaned files
const deleteOrphanedSchema = z.object({
  type: z.enum(['jpg', 'raw'], { message: '无效类型' }),
  folder: z.string().min(1, '缺少 folder 参数'),
})

router.post('/orphaned', validate(deleteOrphanedSchema, 'body'), asyncHandler(async (req, res) => {
  const { type, folder } = req.body
  const photos = getPhotosForFolder(folder)
  const orphaned = photos.filter(p => p.orphanType === type)

  const result = await deleteOrphanedFiles(orphaned, type)
  res.json({ success: true, deleted: result.deleted, failed: result.failed })
}))

export default router
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/settings.ts server/src/routes/batch.ts
git commit -m "feat: extract settings and batch routes into dedicated modules"
```

---

## Task 11: Rewrite routes/index.ts as Registration Hub

**Files:**
- Modify: `server/src/routes/index.ts` (complete rewrite)

- [ ] **Step 1: Replace routes/index.ts with registration-only file**

Replace entire content of `server/src/routes/index.ts` with:

```typescript
import { Router } from 'express'
import folders from './folders.js'
import photos from './photos.js'
import reviews from './reviews.js'
import similarity from './similarity.js'
import settings from './settings.js'
import batch from './batch.js'

const router = Router()

router.use('/folders', folders)
router.use('/photos', photos)
router.use('/reviews', reviews)
router.use('/similarity', similarity)
router.use('/settings', settings)
router.use('/batch', batch)

export default router
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd server && npx tsc --noEmit && cd ..`

Expected: no errors (there may be import issues from `isPathAllowed` being shared — see Task 12 for the shared security utility).

**Note:** Several route files (`reviews.ts`, `similarity.ts`, `batch.ts`) import `isPathAllowed` from `./folders.js`. This cross-module import works but is a code smell. We'll address it in Task 14 when creating a shared utility.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/index.ts
git commit -m "refactor: replace monolithic routes with registration hub"
```

---

## Task 12: Extract Shared Security Utility

**Files:**
- Create: `server/src/utils/security.ts`
- Modify: `server/src/routes/folders.ts`
- Modify: `server/src/routes/reviews.ts`
- Modify: `server/src/routes/similarity.ts`

- [ ] **Step 1: Create shared path security utility**

Create `server/src/utils/security.ts`:

```typescript
import { resolveNormalized } from './path.js'

const BLOCKED_PREFIXES = [
  '/etc', '/usr', '/bin', '/sbin', '/var', '/System', '/Library',
  '/private/etc', '/private/var', '/dev', '/proc', '/sys',
  'C:/Windows', 'C:/Program Files', 'C:/Program Files (x86)', 'C:/ProgramData',
]

export function isPathAllowed(p: string): boolean {
  const resolved = resolveNormalized(p).toLowerCase()
  return !BLOCKED_PREFIXES.some(prefix => resolved === prefix.toLowerCase() || resolved.startsWith(prefix.toLowerCase() + '/'))
}
```

- [ ] **Step 2: Update folders.ts — remove local BLOCKED_PREFIXES and isPathAllowed**

In `server/src/routes/folders.ts`:
- Remove the `BLOCKED_PREFIXES` constant and the local `isPathAllowed` function
- Change the import to: `import { isPathAllowed } from '../utils/security.js'`
- Remove the import line: `import { resolveNormalized } from '../utils/path.js'` (no longer needed directly)

- [ ] **Step 3: Update reviews.ts — change import source**

In `server/src/routes/reviews.ts`:
- Remove: `import { isPathAllowed } from './folders.js'`
- Add: `import { isPathAllowed } from '../utils/security.js'`
- Move the `import { getPhotosForFolder } from '../services/scanner.js'` to the top-level imports (remove the late import)

The corrected top-level imports should be:

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { getPhotoById, getPhotosForFolder, scanFolder } from '../services/scanner.js'
import { recordReview, getRandomUnreviewedPhoto, getRandomUnreviewedPhotos, getCacheDays } from '../services/review.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validate } from '../middleware/validate.js'
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler.js'
import { isPathAllowed } from '../utils/security.js'
```

Remove the duplicate late import of `getPhotosForFolder` and the import of `ValidationError` (unused in this file).

- [ ] **Step 4: Update similarity.ts — change import source**

In `server/src/routes/similarity.ts`:
- Remove: `import { isPathAllowed } from './folders.js'`
- Add: `import { isPathAllowed } from '../utils/security.js'`

- [ ] **Step 5: Verify TypeScript compilation**

Run: `cd server && npx tsc --noEmit && cd ..`

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add server/src/utils/security.ts server/src/routes/folders.ts server/src/routes/reviews.ts server/src/routes/similarity.ts
git commit -m "refactor: extract shared path security utility"
```

---

## Task 13: Async Scanner

**Files:**
- Modify: `server/src/services/scanner.ts`

- [ ] **Step 1: Convert scanner to async**

Replace `server/src/services/scanner.ts` with:

```typescript
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { resolveNormalized, normalizePath } from '../utils/path.js'

const JPG_EXTS = new Set(['.jpg', '.jpeg'])
const RAW_EXTS = new Set(['.cr2', '.cr3', '.nef'])

export interface PhotoGroup {
  id: string
  name: string
  jpgPath: string | null
  rawPaths: string[]
  hasJpg: boolean
  hasRaw: boolean
  isOrphan: boolean
  orphanType?: 'jpg' | 'raw'
  date?: string
  folder: string
  subfolder: string
}

export interface SubfolderInfo {
  name: string
  path: string
  count: number
}

// In-memory store for scanned photos (keyed by folder path)
const MAX_FOLDERS = 10
const photoStore = new Map<string, PhotoGroup[]>()
const photoIndex = new Map<string, PhotoGroup>()

export function getPhotoById(id: string): PhotoGroup | undefined {
  return photoIndex.get(id)
}

export function getPhotosForFolder(folder: string): PhotoGroup[] {
  return photoStore.get(resolveNormalized(folder)) || []
}

export function getSubfolders(folder: string): SubfolderInfo[] {
  const photos = photoStore.get(resolveNormalized(folder)) || []
  const counts = new Map<string, number>()
  for (const p of photos) {
    counts.set(p.subfolder, (counts.get(p.subfolder) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([p, count]) => ({
      name: p === '.' ? '(根目录)' : path.basename(p),
      path: p,
      count,
    }))
    .sort((a, b) => {
      if (a.path === '.') return -1
      if (b.path === '.') return 1
      return a.name.localeCompare(b.name, 'zh-CN')
    })
}

export function removePhoto(id: string): boolean {
  const photo = photoIndex.get(id)
  if (!photo) return false
  photoIndex.delete(id)
  const list = photoStore.get(photo.folder)
  if (list) {
    const idx = list.indexOf(photo)
    if (idx !== -1) list.splice(idx, 1)
  }
  return true
}

export async function scanFolder(folderPath: string): Promise<{
  photos: PhotoGroup[]
  total: number
  paired: number
  orphanJpg: number
  orphanRaw: number
}> {
  const normalized = resolveNormalized(folderPath)

  const stat = await fs.promises.stat(normalized)
  if (!stat.isDirectory()) {
    throw new Error('路径不是一个文件夹')
  }

  const groups = new Map<string, { jpg: string[]; raw: string[]; dir: string }>()
  const visited = new Set<string>()

  const walkDir = async (dir: string) => {
    const realDir = await fs.promises.realpath(dir)
    if (visited.has(realDir)) return
    visited.add(realDir)
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = normalizePath(path.join(dir, entry.name))
      if (entry.isDirectory()) {
        await walkDir(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        const baseName = path.basename(entry.name, path.extname(entry.name))

        if (JPG_EXTS.has(ext) || RAW_EXTS.has(ext)) {
          const key = normalizePath(path.join(dir, baseName))
          if (!groups.has(key)) {
            groups.set(key, { jpg: [], raw: [], dir })
          }
          const group = groups.get(key)!
          if (JPG_EXTS.has(ext)) {
            group.jpg.push(fullPath)
          } else {
            group.raw.push(fullPath)
          }
        }
      }
    }
  }

  await walkDir(normalized)

  const photos: PhotoGroup[] = []
  let paired = 0
  let orphanJpg = 0
  let orphanRaw = 0

  for (const [key, group] of groups) {
    const hasJpg = group.jpg.length > 0
    const hasRaw = group.raw.length > 0
    const isOrphan = !hasJpg || !hasRaw
    let orphanType: 'jpg' | 'raw' | undefined
    if (isOrphan) {
      orphanType = hasJpg ? 'jpg' : 'raw'
    }

    let date: string | undefined
    try {
      const fileStat = await fs.promises.stat(group.jpg[0] || group.raw[0])
      date = fileStat.mtime.toISOString().slice(0, 10)
    } catch {}

    const relative = path.relative(normalized, group.dir) || '.'
    const photo: PhotoGroup = {
      id: crypto.createHash('md5').update(key).digest('hex'),
      name: path.basename(key) + (hasJpg ? '.JPG' : path.extname(group.raw[0]).toUpperCase()),
      jpgPath: hasJpg ? group.jpg[0] : null,
      rawPaths: group.raw,
      hasJpg,
      hasRaw,
      isOrphan,
      orphanType,
      date,
      folder: normalized,
      subfolder: normalizePath(relative),
    }

    photos.push(photo)
    if (isOrphan) {
      if (orphanType === 'jpg') orphanJpg++
      else orphanRaw++
    } else {
      paired++
    }
  }

  photos.sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  // Clean up old index entries for this folder
  const oldPhotos = photoStore.get(normalized)
  if (oldPhotos) {
    for (const p of oldPhotos) photoIndex.delete(p.id)
  }

  // Evict oldest folder if at capacity
  if (!photoStore.has(normalized) && photoStore.size >= MAX_FOLDERS) {
    const oldestKey = photoStore.keys().next().value
    if (oldestKey !== undefined) {
      const oldest = photoStore.get(oldestKey)!
      for (const p of oldest) photoIndex.delete(p.id)
      photoStore.delete(oldestKey)
    }
  }

  photoStore.set(normalized, photos)
  for (const p of photos) photoIndex.set(p.id, p)

  return { photos, total: photos.length, paired, orphanJpg, orphanRaw }
}
```

Key changes from original:
- `fs.readdirSync` → `await fs.promises.readdir`
- `fs.statSync` → `await fs.promises.stat`
- `fs.realpathSync` → `await fs.promises.realpath`
- `scanFolder` returns `Promise`

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd server && npx tsc --noEmit && cd ..`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/scanner.ts
git commit -m "perf: convert scanner to async I/O (fs.promises)"
```

---

## Task 14: Parallel Similarity Hash Computation

**Files:**
- Modify: `server/src/services/similarity.ts`

- [ ] **Step 1: Add p-limit parallel hash computation**

In `server/src/services/similarity.ts`:

Add import at the top:

```typescript
import pLimit from 'p-limit'
```

In the `analyzeFolder` function, replace the sequential for-loop (lines ~163-189) with parallel batch:

Replace this block:

```typescript
  for (const photo of photos) {
    const filePath = photo.jpgPath || photo.rawPaths[0]
    if (!filePath) continue

    const existing = existingHashes.get(photo.id)
    if (existing) {
      photoHashMap.set(photo.id, existing)
      skipped++
    } else {
      try {
        const result = await computeDHash(filePath)
        const record: HashRecord = {
          filePath,
          dhash: result.hash,
          width: result.width,
          height: result.height,
          fileSize: result.fileSize,
        }
        insertStmt.run(filePath, result.hash, result.width, result.height, result.fileSize)
        photoHashMap.set(photo.id, record)
        computed++
      } catch {
        // Skip photos that fail to process
      }
    }
    processed++
    onProgress?.(processed, total)
  }
```

With:

```typescript
  const limit = pLimit(4)

  await Promise.all(photos.map(photo => limit(async () => {
    const filePath = photo.jpgPath || photo.rawPaths[0]
    if (!filePath) return

    const existing = existingHashes.get(photo.id)
    if (existing) {
      photoHashMap.set(photo.id, existing)
      skipped++
    } else {
      try {
        const result = await computeDHash(filePath)
        const record: HashRecord = {
          filePath,
          dhash: result.hash,
          width: result.width,
          height: result.height,
          fileSize: result.fileSize,
        }
        insertStmt.run(filePath, result.hash, result.width, result.height, result.fileSize)
        photoHashMap.set(photo.id, record)
        computed++
      } catch {
        // Skip photos that fail to process
      }
    }
    processed++
    onProgress?.(processed, total)
  })))
```

Note: `computed`, `skipped`, and `processed` were `let` variables — they remain `let` (parallel increments are fine since p-limit concurrency=4 and better-sqlite3 is synchronous, so only one runs at a time within the event loop tick).

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd server && npx tsc --noEmit && cd ..`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/similarity.ts
git commit -m "perf: parallel hash computation with p-limit (concurrency=4)"
```

---

## Task 15: Optimize Image Service — Use ThumbnailCache

**Files:**
- Modify: `server/src/services/image.ts`

- [ ] **Step 1: Update image.ts to use thumbnailCache and remove old LRU logic**

Replace `server/src/services/image.ts` with:

```typescript
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { type PhotoGroup } from './scanner.js'

const RAW_EXTS = new Set(['.cr2', '.cr3', '.nef'])

export { getOrGenerateThumbnail as getThumbnail } from '../cache/thumbnailCache.js'

export async function getFullImage(photo: PhotoGroup): Promise<Buffer | NodeJS.ReadableStream | null> {
  const sourcePath = photo.jpgPath || photo.rawPaths[0]
  if (!sourcePath || !fs.existsSync(sourcePath)) return null

  const ext = path.extname(sourcePath).toLowerCase()
  if (RAW_EXTS.has(ext)) {
    try {
      return await sharp(sourcePath, { failOn: 'none' }).rotate().jpeg({ quality: 90 }).toBuffer()
    } catch {
      return null
    }
  }

  return fs.createReadStream(sourcePath)
}

export function getImageMimeType(photo: PhotoGroup): string {
  const sourcePath = photo.jpgPath || photo.rawPaths[0]
  if (!sourcePath) return 'image/jpeg'
  const ext = path.extname(sourcePath).toLowerCase()
  if (RAW_EXTS.has(ext)) return 'image/jpeg'
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  }
  return mimeMap[ext] || 'application/octet-stream'
}
```

Key changes:
- Removed `THUMBNAIL_SIZE`, `MAX_CACHE_SIZE`, and manual LRU `thumbCache`
- `getThumbnail` re-exported from `cache/thumbnailCache.ts`
- `getFullImage` and `getImageMimeType` unchanged

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd server && npx tsc --noEmit && cd ..`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/image.ts
git commit -m "refactor: image service delegates to thumbnailCache for thumbnails"
```

---

## Task 16: Optimize EXIF Service — Partial Read + Cache

**Files:**
- Modify: `server/src/services/exif.ts`

- [ ] **Step 1: Update exif.ts with partial read and cache**

Replace `server/src/services/exif.ts` with:

```typescript
import fs from 'fs'
import exifr from 'exifr'
import { type PhotoGroup } from './scanner.js'
import { getCachedExif, setCachedExif } from '../cache/exifCache.js'

export interface ExifData {
  camera: string
  lens: string
  focalLength: string
  aperture: string
  shutterSpeed: string
  iso: string
  width: number
  height: number
  dateTime: string
  fileSize: string
}

export async function extractExif(photo: PhotoGroup): Promise<ExifData | null> {
  // Check cache first
  const cached = getCachedExif(photo.id)
  if (cached) return cached

  const sourcePath = photo.jpgPath || photo.rawPaths[0]
  if (!sourcePath || !fs.existsSync(sourcePath)) return null

  try {
    // Read only first 256KB for EXIF extraction (EXIF data is in file header)
    const handle = await fs.promises.open(sourcePath, 'r')
    const buf = Buffer.alloc(256 * 1024)
    await handle.read(buf, 0, buf.length, 0)
    await handle.close()

    const data = await exifr.parse(buf, {
      pick: [
        'Make', 'Model', 'LensModel',
        'FocalLength', 'FNumber', 'ExposureTime', 'ISO',
        'ExifImageWidth', 'ExifImageHeight', 'ImageWidth', 'ImageHeight',
        'DateTimeOriginal', 'CreateDate',
      ],
    })

    if (!data) return null

    const make = data.Make || ''
    const model = data.Model || ''
    const camera = [make, model.replace(make, '')].filter(Boolean).join(' ').trim() || model || '—'

    const focalLength = data.FocalLength ? `${Math.round(data.FocalLength)}mm` : '—'

    const aperture = data.FNumber ? `f/${data.FNumber}` : '—'

    const shutterSpeed = data.ExposureTime
      ? data.ExposureTime >= 1
        ? `${data.ExposureTime}s`
        : `1/${Math.round(1 / data.ExposureTime)}s`
      : '—'

    const iso = data.ISO ? `ISO ${data.ISO}` : '—'

    const width = data.ExifImageWidth || data.ImageWidth || 0
    const height = data.ExifImageHeight || data.ImageHeight || 0

    const dateTime = data.DateTimeOriginal || data.CreateDate || null
    const dateTimeStr = dateTime
      ? `${dateTime.getFullYear()}-${String(dateTime.getMonth() + 1).padStart(2, '0')}-${String(dateTime.getDate()).padStart(2, '0')} ${String(dateTime.getHours()).padStart(2, '0')}:${String(dateTime.getMinutes()).padStart(2, '0')}:${String(dateTime.getSeconds()).padStart(2, '0')}`
      : '—'

    let jpgSize = 0
    let rawSize = 0
    if (photo.jpgPath) {
      try { jpgSize = fs.statSync(photo.jpgPath).size } catch {}
    }
    for (const rp of photo.rawPaths) {
      try { rawSize += fs.statSync(rp).size } catch {}
    }
    const totalSize = jpgSize + rawSize

    const result: ExifData = {
      camera,
      lens: data.LensModel || '—',
      focalLength,
      aperture,
      shutterSpeed,
      iso,
      width,
      height,
      dateTime: dateTimeStr,
      fileSize: formatSize(totalSize) + (jpgSize > 0 && rawSize > 0 ? ` (JPG ${formatSize(jpgSize)} + RAW ${formatSize(rawSize)})` : ''),
    }

    setCachedExif(photo.id, result)
    return result
  } catch {
    return null
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
```

Key changes:
- Added cache check (`getCachedExif`) at the top
- Replaced `fs.readFileSync(sourcePath)` with partial read (first 256KB via `fs.promises.open`)
- Caches result via `setCachedExif` before returning

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd server && npx tsc --noEmit && cd ..`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/exif.ts
git commit -m "perf: EXIF partial read (256KB) + memory cache"
```

---

## Task 17: Update Server Entry Point

**Files:**
- Create: `server/src/utils/cleanupPort.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Extract cleanupPort utility**

Create `server/src/utils/cleanupPort.ts`:

```typescript
import { execSync } from 'child_process'

export function killPortOccupant(port: number): void {
  try {
    const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const match = out.match(/\s+(\d+)\s*$/m)
    if (match) {
      const pid = Number(match[1])
      console.log(`[server] 端口 ${port} 被 PID ${pid} 占用，正在终止...`)
      process.kill(pid)
      const deadline = Date.now() + 3000
      while (Date.now() < deadline) {
        try {
          const check = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          })
          if (!check.trim()) break
        } catch { break }
      }
    }
  } catch {
    // 端口空闲
  }
}
```

- [ ] **Step 2: Simplify server entry point**

Replace `server/src/index.ts` with:

```typescript
import express from 'express'
import cors from 'cors'
import { getDb } from './db/index.js'
import routes from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { killPortOccupant } from './utils/cleanupPort.js'

const PORT = process.env.PORT || 3001

killPortOccupant(Number(PORT))

// Initialize database
getDb()

const app = express()
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))
app.use(express.json())
app.use('/api', routes)
app.use(errorHandler)

process.on('uncaughtException', (err) => {
  console.error('[server] 未捕获异常:', err)
  process.exit(1)
})

const server = app.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`Photo Review server running at http://127.0.0.1:${PORT}`)
})

server.on('error', (err: NodeJS.ErrnoException) => {
  console.error(`[server] 启动失败: ${err.message}`)
  process.exit(1)
})

process.on('SIGTERM', () => server.close())
process.on('SIGINT', () => server.close())
```

Key changes:
- `killPortOccupant` extracted to `utils/cleanupPort.ts`
- `errorHandler` middleware added as the last middleware
- Otherwise minimal changes to keep risk low

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd server && npx tsc --noEmit && cd ..`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/utils/cleanupPort.ts server/src/index.ts
git commit -m "refactor: extract cleanupPort utility and add error middleware to entry"
```

---

## Task 18: Update agent-index.md

**Files:**
- Modify: `docs/architecture/agent-index.md`

- [ ] **Step 1: Update file index to reflect new structure**

In `docs/architecture/agent-index.md`, update the "服务端" section to reflect:

- `middleware/` — 错误处理 (errorHandler) + zod 校验 (validate) + photo 加载 (loadPhoto) + async 包装 (asyncHandler)
- `routes/folders.ts` — 文件夹浏览 + 扫描 + 子文件夹
- `routes/photos.ts` — 照片列表 + 缩略图 + 全图 + EXIF + 删除
- `routes/reviews.ts` — 审阅提交 + 随机照片
- `routes/similarity.ts` — 相似分析 SSE + 分组 + 统计
- `routes/settings.ts` — 设置读写
- `routes/batch.ts` — 批量孤立文件操作
- `routes/index.ts` — 路由注册入口
- `cache/thumbnailCache.ts` — 内存+磁盘双层缩略图缓存
- `cache/exifCache.ts` — EXIF 内存 LRU 缓存
- `db/migrations.ts` — 数据库迁移定义
- `utils/security.ts` — 路径白名单安全检查
- `utils/cleanupPort.ts` — 端口清理

Also update the task routing table entries that reference routes:

- 修改 API 端点 → `routes/index.ts` 改为 `routes/对应文件.ts`
- 安全相关 → 增加 `utils/security.ts`

- [ ] **Step 2: Commit**

```bash
git add docs/architecture/agent-index.md
git commit -m "docs: update agent-index.md to reflect new backend structure"
```

---

## Task 19: End-to-End Verification

- [ ] **Step 1: Start the dev server and verify it boots**

Run: `npm run dev`

Expected: both frontend and backend start without errors. Backend logs `Photo Review server running at http://127.0.0.1:3001`.

- [ ] **Step 2: Verify core functionality manually**

Open browser to `http://localhost:5173` and test:
1. Select a photo folder and scan → should return scan stats
2. Browse grid page → thumbnails should load (from disk cache on 2nd run)
3. Open review page → navigate photos, keep/delete
4. Open random page → load a batch
5. Open similar page → trigger analysis → view groups
6. Check `server/data/thumbnails/` → should contain `.jpg` cache files

- [ ] **Step 3: Run e2e tests**

Run: `npm run test:e2e`

Expected: all existing e2e tests pass.

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during e2e verification"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- ✅ 路由拆分 (Section 一) → Tasks 6-11
- ✅ 错误中间件 (Section 1.1) → Task 2
- ✅ zod 校验 (Section 1.2) → Task 3
- ✅ loadPhoto 中间件 (Section 1.3) → Task 3
- ✅ asyncHandler (Section 1.4) → Task 2
- ✅ scanner 异步化 (Section 2.1) → Task 13
- ✅ similarity 并行 (Section 2.2) → Task 14
- ✅ 双层缩略图缓存 (Section 2.3) → Tasks 5, 15
- ✅ EXIF 缓存+部分读取 (Section 2.4) → Tasks 5, 16
- ✅ 数据库迁移 (Section 3.1) → Task 4
- ✅ 入口精简 (Section 3.2) → Task 17
- ✅ 前端兼容 (Section 3.4) → API paths unchanged, no frontend changes

**2. Placeholder scan:** No TBD/TODO. All code shown inline.

**3. Type consistency:**
- `PhotoGroup` imported from `services/scanner.ts` consistently
- `ExifData` exported from `services/exif.ts` and imported in `cache/exifCache.ts`
- `getThumbnail` re-exported from `cache/thumbnailCache.ts` via `image.ts`
- `isPathAllowed` moved from `routes/folders.ts` to `utils/security.ts`
