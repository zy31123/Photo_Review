# Photo Review Architecture Guide

## 1. Project Overview

Photo Review is a local photo review tool with a Darkroom visual theme.
After selecting a local folder, the system scans for JPG/RAW files and pairs them.
Users can review photos one-by-one, randomly, or batch-process orphaned files.

Architecture: npm workspaces monorepo with `client/` (React frontend) and `server/` (Express backend).
Vite dev proxy forwards `/api` to backend port 3001.

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React + TypeScript | React 19 |
| Routing | react-router-dom | 7.x |
| Build | Vite | 6.x |
| Styling | Tailwind CSS | 4.x (@tailwindcss/vite plugin) |
| Backend Framework | Express + TypeScript | Express 5 |
| Database | better-sqlite3 | 11.x (WAL mode) |
| Image Processing | sharp | 0.33.x |
| EXIF Parsing | exifr | 7.x |
| Delete Operation | trash | 10.x (move to system trash) |
| Runtime | Node.js | 22 |

## 3. Directory Structure

```
Photo_Review/
├── package.json                    # monorepo root, workspaces: ["client", "server"]
├── CLAUDE.md                       # Claude AI configuration
├── AGENTS.md                       # Points to CLAUDE.md
├── client/
│   ├── index.html                  # HTML entry
│   ├── vite.config.ts              # Vite config, React + Tailwind plugins, /api proxy
│   ├── package.json                # type: module
│   └── src/
│       ├── main.tsx                # Render entry: StrictMode + BrowserRouter
│       ├── App.tsx                 # Route definitions: / /review /batch /random
│       ├── api/index.ts            # API client layer, all backend call wrappers
│       ├── context/
│       │   └── ReviewContext.tsx    # Review page state management (ReviewProvider + useReview)
│       ├── hooks/
│       │   ├── useDateGroups.ts    # Date grouping calculation (month→day two-level)
│       │   ├── useKeyboardShortcuts.ts # Global keyboard shortcuts
│       │   └── useRandomBatch.ts   # Random batch state management
│       ├── pages/
│       │   ├── HomePage.tsx        # Home: folder selection + scan trigger
│       │   ├── ReviewPage.tsx      # Review: three-column layout, core page
│       │   ├── BatchPage.tsx       # Batch: orphaned files display + batch delete
│       │   └── RandomPage.tsx      # Random browse: batch random + details panel
│       ├── components/
│       │   ├── FolderPicker.tsx    # Folder browser (modal)
│       │   ├── review/
│       │   │   ├── DateSidebar.tsx       # Left date navigation
│       │   │   ├── ImageViewport.tsx     # Center image viewport
│       │   │   ├── ReviewControls.tsx    # Bottom floating action buttons
│       │   │   ├── ReviewToolbar.tsx     # Top toolbar
│       │   │   ├── DetailsPanel.tsx      # Right details panel (ReviewContext wrapper)
│       │   │   ├── PhotoDetailsView.tsx  # Pure presentational photo details (reusable)
│       │   │   └── Filmstrip.tsx         # Bottom filmstrip
│       │   ├── random/
│       │   │   ├── RandomToolbar.tsx     # Random mode top toolbar
│       │   │   ├── RandomControls.tsx    # Random mode floating action buttons
│       │   │   └── BatchSelector.tsx     # Batch size selector
│       │   └── ui/
│       │       └── SectionHeader.tsx     # Generic section title
│       └── styles/
│           └── index.css           # Tailwind 4 @theme (Darkroom color system)
├── server/
│   ├── package.json                # type: module
│   └── src/
│       ├── index.ts                # Express entry, CORS, port 127.0.0.1:3001
│       ├── db/index.ts             # SQLite connection (WAL), schema initialization
│       ├── routes/index.ts         # 15 API endpoints + path security whitelist
│       ├── services/
│       │   ├── scanner.ts          # File scanning + JPG/RAW pairing
│       │   ├── image.ts            # Thumbnail generation + LRU cache
│       │   ├── exif.ts             # EXIF metadata extraction
│       │   ├── review.ts           # Review records + random selection + batch + stats
│       │   └── deleter.ts          # Delete to system trash
│       └── utils/
│           └── path.ts             # Path normalization utilities
└── docs/
    └── architecture/
        ├── agent-index.md          # Agent routing index
        ├── guide.zh-CN.md          # Chinese architecture guide
        └── guide.en.md             # This file
```

## 4. Core Data Models

### 4.1 PhotoGroup

```typescript
interface PhotoGroup {
  id: string           // MD5(normalized path)
  name: string         // Display name, format "basename.JPG" or "basename.CR2"
  jpgPath: string | null
  rawPaths: string[]   // May have multiple RAW files
  hasJpg: boolean
  hasRaw: boolean
  isOrphan: boolean    // hasJpg XOR hasRaw
  orphanType?: 'jpg' | 'raw'
  date?: string        // ISO date "YYYY-MM-DD", from file mtime
  folder: string       // Normalized folder path
}
```

Pairing rule: JPG and RAW files with the same base name (excluding extension) are grouped together.
Supported formats: JPG (.jpg, .jpeg), RAW (.cr2, .cr3, .nef).
ID generation: MD5(normalized directory path + file base name).

Storage: in-memory Map keyed by normalized folder path, capped at 10 folders.
Scan results also maintain a global index `photoIndex: Map<id, PhotoGroup>` for ID lookups.

### 4.2 ExifData

```typescript
interface ExifData {
  camera: string       // "Canon EOS R5" format
  lens: string
  focalLength: string  // "50mm"
  aperture: string     // "f/1.8"
  shutterSpeed: string // "1/200s"
  iso: string          // "ISO 400"
  width: number
  height: number
  dateTime: string     // "2024-01-15 14:30:00"
  fileSize: string     // "25.3 MB (JPG 8.2 MB + RAW 17.1 MB)"
}
```

Uses the exifr library to extract from the source file. File size automatically combines JPG and all associated RAW files.

### 4.3 ReviewRecord — Database Table

```sql
CREATE TABLE review_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT UNIQUE NOT NULL,
  file_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('keep', 'deleted')),
  review_mode TEXT NOT NULL CHECK(review_mode IN ('sequential', 'random')),
  reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  cache_until DATETIME
);
```

- `cache_until`: only used in random review mode. Value is `reviewed_at + random_cache_days`.
  Cached photos will not reappear in random review; they become available again after cache expiry.
- `random_cache_days` setting is stored in the `settings` table, default 7 days.

### 4.4 Settings — Database Table

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Currently has one setting: `random_cache_days` (default "7").

## 5. API Endpoints

All endpoints prefixed with `/api`. Vite dev proxy forwards to `http://127.0.0.1:3001`.

### 5.1 Folders

| Method | Path | Description |
|--------|------|-------------|
| GET | `/folders/browse?path=` | Browse directories. Returns drive/volume list when path is empty. Response: `{ current, parent, children[] }` |
| POST | `/folders/scan` | Scan folder. Body: `{ path }`. Response: `{ total, paired, orphanJpg, orphanRaw }` |

### 5.2 Photos

| Method | Path | Description |
|--------|------|-------------|
| GET | `/photos?folder=&page=&limit=` | List photos (paginated, default 2000) |
| GET | `/photos/:id/thumbnail` | Get thumbnail (200px JPEG, Cache-Control: 1h) |
| GET | `/photos/:id/full` | Get full image (JPG streamed directly, RAW converted to JPEG, Cache-Control: 24h) |
| GET | `/photos/:id/exif` | Get EXIF metadata |
| DELETE | `/photos/:id` | Delete photo (JPG+RAW moved to system trash) |

### 5.3 Batch Operations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/batch/orphaned?folder=` | List orphaned files `{ jpg[], raw[] }` |
| POST | `/batch/orphaned` | Batch delete orphans. Body: `{ type: 'jpg'\|'raw', folder }` |

### 5.4 Reviews

| Method | Path | Description |
|--------|------|-------------|
| POST | `/reviews` | Submit review. Body: `{ photoId, action: 'keep'\|'deleted', mode: 'sequential'\|'random' }` |
| GET | `/reviews/random?folder=` | Get one unreviewed photo (excluding cached) |
| GET | `/reviews/random/batch?folder=&count=N` | Get N unreviewed photos (count 1-100, Fisher-Yates) |

### 5.5 Stats & Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats?folder=` | Review statistics `{ total, reviewed, pending, orphanJpg, orphanRaw }` |
| GET | `/settings` | Get settings `{ random_cache_days }` |
| PUT | `/settings` | Update settings. Body: `{ random_cache_days }` |

## 6. State Management

### 6.1 Review Page — ReviewContext

`ReviewContext` is the core state manager for the review page (`/review`), using React Context + useState.

**State**:
- `photos: PhotoGroup[]` — all photos in the current folder
- `filteredPhotos: PhotoGroup[]` — photos filtered by date
- `currentIndex: number` — current browse position
- `currentPhoto: PhotoGroup | null` — current photo
- `selectedDate: string | null` — date filter condition
- `leftSidebarOpen: boolean` — left sidebar toggle
- `rightPanelOpen: boolean` — right panel toggle
- `loading: boolean` — loading state
- `error: string` — error message
- `reviewedIds: Set<string>` — IDs of photos reviewed in this session
- `monthGroups: MonthGroup[]` — month/date grouping data

**Actions**:
- `goTo(index)` — jump to specified position
- `setDateFilter(date)` — set date filter (null means all)
- `toggleLeftSidebar()` / `toggleRightPanel()` — toggle sidebars
- `handleAction('keep' | 'deleted')` — execute review action (delete via API, then record, then advance)
- `refresh()` — reload photo list

**Action Flow** (handleAction):
1. If action is 'deleted', call `api.deletePhoto()` to move to trash
2. Call `api.submitReview()` to record the review
3. Add photoId to `reviewedIds`
4. Auto-advance to next photo

### 6.2 Date Grouping — useDateGroups

Groups photos by month→day (two-level), returns:
- `monthGroups: MonthGroup[]` — array of months, each containing `dates: DateGroup[]`
- `filteredPhotos` — subset filtered by `selectedDate`
- `dateOfIndex: Map<number, string>` — index-to-date mapping

### 6.3 Keyboard Shortcuts — useKeyboardShortcuts

| Key | Action |
|-----|--------|
| ArrowLeft | Previous |
| ArrowRight | Next |
| Space | Keep |
| D | Delete |
| R | Skip (random browse mode) |
| [ | Toggle left date sidebar |
| ] | Toggle right details panel |

Only active when focus is not in an input field. Both ReviewPage and RandomPage use this hook.

### 6.4 Random Browse — useRandomBatch

`useRandomBatch` is a custom hook for the random browse page (`/random`), encapsulating batch state and action logic.

**State**:
- `photos: PhotoGroup[]` — current batch of photos
- `currentIndex: number` — current browse position
- `currentPhoto: PhotoGroup | null` — current photo
- `batchSize: number` — batch size (default 20, options: 10/20/50/100)
- `actionedSet: Set<number>` — indices actioned in current batch
- `sessionReviewed: number` — total reviewed count this session
- `loading: boolean` — loading state
- `error: string` — error message
- `exhausted: boolean` — no more unreviewed photos
- `rightPanelOpen: boolean` — right panel toggle

**Actions**:
- `loadBatch(size?)` — load a batch of random photos (calls `api.getRandomPhotos`)
- `goTo(index)` / `goNext()` / `goPrev()` — navigate within batch
- `handleAction('keep' | 'deleted' | 'skip')` — execute action, auto-advance, auto-load next batch at end
- `changeBatchSize(size)` — change batch size
- `toggleRightPanel()` — toggle details panel

**Batch exhaustion**: When the last photo in a batch is actioned, `loadBatch()` is called automatically.
If the server returns an empty array, `exhausted=true` is set and a completion screen is shown.

### 6.5 Other Page State

- **BatchPage** — page-level useState, manages orphaned files list, delete confirmation dialog, processing state.

### 6.6 activeFolder Module-level State

`client/src/api/index.ts` maintains a module-level variable `activeFolder`.
HomePage sets this value before navigating to the review page; the API layer automatically appends the `folder` parameter to requests.
Other pages use `getActiveFolder()` to check for an active folder.

## 7. Design Decisions

### 7.1 In-Memory Storage vs Database
Scan results are stored in Node.js process memory (Map), not persisted.
Rationale: photo files change frequently (added/deleted); recalculating on each scan is more reliable.
Review records are persisted in SQLite for cross-session tracking.

### 7.2 Soft Delete
Uses the `trash` library to move files to system trash instead of permanent deletion.
Rationale: safety net against accidental deletion. Users can recover from system trash.

### 7.3 LRU Thumbnail Cache
Maintains an in-memory LRU cache of up to 500 thumbnails.
Rationale: avoids regenerating thumbnails on every request (sharp processing has CPU cost),
while preventing unbounded memory growth.

### 7.4 GET Request Auto-Retry
API client automatically retries GET requests up to 3 times with increasing intervals (1s, 2s).
Rationale: backend may not be fully ready when Vite proxy connects.

### 7.5 Filmstrip Windowing
The Filmstrip component only renders 150 thumbnails before and after the current index.
Rationale: prevents performance issues from excessive DOM nodes.

### 7.6 Security Design
- Server listens only on 127.0.0.1:3001 (not exposed externally)
- `isPathAllowed()` rejects system directories (/etc, /usr, C:\Windows, etc.)
- Symlink protection: `fs.realpathSync()` detects cycles during scanning
- CORS restricted to localhost:5173

### 7.7 Cross-Platform Support
- Path normalization: unified `/` separator (`normalizePath()`)
- Folder browsing: Windows uses PowerShell for drive detection, macOS reads /Volumes
- Special handling for drive root directories (Windows drives need trailing backslash)

## 8. Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend (concurrently) |
| `npm run dev:client` | Frontend only (Vite, port 5173) |
| `npm run dev:server` | Backend only (tsx watch, port 3001) |
| `npm run build` | Build both frontend and backend |
