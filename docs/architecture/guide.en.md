# Photo Review Architecture Guide

## 1. Project Overview

Photo Review is a local photo review tool with a Darkroom visual theme.
After selecting a local folder, the system scans for JPG/RAW files and pairs them.
Users can browse photos in a virtual grid, review one-by-one, or randomly.

Architecture: npm workspaces monorepo with `client/` (React frontend) and `server/` (Express backend).
Vite dev proxy forwards `/api` to backend port 3001.

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React + TypeScript | React 19 |
| Routing | react-router-dom | 7.x |
| Build | Vite | 6.x |
| Styling | Tailwind CSS | 4.x (@tailwindcss/vite plugin) |
| Virtualization | @tanstack/react-virtual | 3.x |
| Icons | lucide-react | 1.x |
| Backend Framework | Express + TypeScript | Express 5 |
| CORS | cors | 2.x |
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
│       ├── App.tsx                 # Route definitions: / /grid /review /random /similar, AppProvider wrapper
│       ├── api/index.ts            # API client layer, all backend call wrappers (PhotoGroup, SubfolderInfo, ExifData, Stats, BrowseResult, ScanResult, SimilarGroup, AnalyzeResult, SimilarStats)
│       ├── context/
│       │   ├── AppContext.tsx       # Root state (activeFolder, photos, settings, isLoaded, loadPhotos)
│       │   ├── GridContext.tsx      # Grid page state (dateSections, virtualItems, subfolder filter, column count)
│       │   ├── ReviewContext.tsx    # Review page state management (ReviewProvider + useReview)
│       │   ├── RandomNavContext.tsx # Random page navigation state
│       │   └── SimilarContext.tsx   # Similar page state management (SimilarProvider + useSimilar)
│       ├── hooks/
│       │   ├── useDateGroups.ts    # Date grouping calculation (month→day two-level, with status and subfolder filtering)
│       │   ├── useKeyboardShortcuts.ts # Global keyboard shortcuts
│       │   ├── useRandomBatch.ts   # Random batch state management
│       │   ├── useExif.ts          # Lazy EXIF loading for a single photo
│       │   ├── useDragImage.ts     # Drag image export (canvas→blob→File)
│       │   ├── useImageZoom.ts     # Zoom and pan (Ctrl+wheel/drag/double-click reset)
│       │   └── useStaggeredReveal.ts # IntersectionObserver staggered reveal animation
│       ├── pages/
│       │   ├── HomePage.tsx        # Home: folder selection + scan trigger
│       │   ├── GridPage.tsx        # Grid: virtualized photo grid + Lightbox + folder/date navigation
│       │   ├── ReviewPage.tsx      # Review: three-column layout, core page
│       │   ├── RandomPage.tsx      # Random browse: batch random + details panel
│       │   └── SimilarPage.tsx     # Similar: analyze → cluster → delete workflow
│       ├── components/
│       │   ├── FolderPicker.tsx    # Folder browser (modal)
│       │   ├── NavBar.tsx          # Global navigation bar (tab-style route switcher, GridControls, ReviewControls)
│       │   ├── grid/
│       │   │   ├── FolderSidebar.tsx   # Left subfolder tree
│       │   │   ├── Lightbox.tsx        # Full-screen image viewer overlay
│       │   │   └── YearTimeline.tsx    # Right vertical date timeline
│       │   ├── review/
│       │   │   ├── DateSidebar.tsx       # Left date navigation
│       │   │   ├── ImageViewport.tsx     # Center image viewport
│       │   │   ├── ReviewControls.tsx    # Bottom floating action buttons
│       │   │   ├── DetailsPanel.tsx      # Right details panel (ReviewContext wrapper)
│       │   │   ├── PhotoDetailsView.tsx  # Pure presentational photo details (reusable)
│       │   │   └── Filmstrip.tsx         # Bottom filmstrip
│       │   ├── random/
│       │   │   ├── BatchSelector.tsx     # Batch size selector
│       │   │   ├── RandomControls.tsx    # Random mode floating action buttons
│       │   │   └── RandomToolbar.tsx     # Random mode top toolbar
│       │   ├── similar/
│       │   │   ├── SimilarToolbar.tsx    # Toolbar (analyze button/stats/batch delete)
│       │   │   ├── ClusterCard.tsx       # Similar group card (thumbnails + keep/delete selection)
│       │   │   └── ClusterGrid.tsx       # Card grid layout
│       │   ├── shared/
│       │   │   ├── DateSidebarBase.tsx   # Shared date sidebar base component
│       │   │   └── useCollapsedMonths.ts # Collapsed month state hook
│       │   └── ui/
│       │       ├── ActionBtn.tsx         # Reusable circular action button
│       │       ├── Badge.tsx             # Status badge (success/danger/neutral/info)
│       │       ├── EmptyState.tsx        # Empty state placeholder
│       │       ├── SectionHeader.tsx     # Generic section title
│       │       ├── SegmentedControl.tsx  # Segmented selector
│       │       ├── ToolbarDivider.tsx    # Vertical divider
│       │       └── Tooltip.tsx           # Hover tooltip (with shortcut display)
│       ├── utils/
│       │   └── date.ts              # formatChineseDate() date formatting
│       └── styles/
│           └── index.css           # Tailwind 4 @theme (Darkroom color system)
├── server/
│   ├── package.json                # type: module
│   └── src/
│       ├── index.ts                # Express entry, CORS, port 127.0.0.1:3001
│       ├── db/index.ts             # SQLite connection (WAL), schema initialization
│       ├── routes/index.ts         # 19 API endpoints + path security whitelist
│       ├── services/
│       │   ├── scanner.ts          # File scanning + JPG/RAW pairing + subfolders
│       │   ├── image.ts            # Thumbnail generation + LRU cache
│       │   ├── exif.ts             # EXIF metadata extraction
│       │   ├── review.ts           # Review records + random selection + batch status + stats
│       │   ├── similarity.ts       # dHash perceptual hash + Union-Find clustering (incremental, photo_hashes persistence)
│       │   └── deleter.ts          # Delete to system trash
│       └── utils/
│           └── path.ts             # Path normalization utilities
├── e2e/
│   ├── playwright.config.ts        # Playwright config
│   ├── fixtures/                   # Test photo generators
│   ├── helpers/                    # Test helper functions
│   ├── tests/                      # E2E tests + visual tests
│   ├── reports/                    # HTML report generation
│   └── screenshots/                # Screenshot output
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
  subfolder: string    // Relative subfolder path from root
  // Client-only fields (populated via GET /photos response)
  reviewAction?: 'keep' | 'deleted' | null
  reviewedAt?: string | null
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

### 4.3 SubfolderInfo

```typescript
interface SubfolderInfo {
  name: string    // Display name
  path: string    // Relative subfolder path
  count: number   // Photo count in this subfolder
}
```

Returned by `getSubfolders()` in `scanner.ts`. Used by FolderSidebar and GridContext.

### 4.4 ReviewStatus

```typescript
interface ReviewStatus {
  action: string      // 'keep' | 'deleted'
  reviewedAt: string  // ISO timestamp
}
```

Returned by `getReviewStatuses()` in `review.ts`. The `GET /photos` endpoint uses this data to populate `reviewAction` and `reviewedAt` fields on each photo.

### 4.5 ReviewRecord — Database Table

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

CREATE INDEX IF NOT EXISTS idx_review_records_cache ON review_records(cache_until);
```

- `cache_until`: only used in random review mode. Value is `reviewed_at + random_cache_days`.
  Cached photos will not reappear in random review; they become available again after cache expiry.
- `random_cache_days` setting is stored in the `settings` table, default 7 days.

### 4.6 Settings — Database Table

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Currently has one setting: `random_cache_days` (default "7").

### 4.7 photo_hashes — Database Table

```sql
CREATE TABLE photo_hashes (
  file_path TEXT PRIMARY KEY,
  dhash TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Stores dHash perceptual hashes (64-bit) for each photo, used for similar image clustering. `similarity.ts` skips photos with existing hashes during incremental computation.

### 4.8 SimilarGroup

```typescript
interface SimilarGroup {
  id: string           // First 12 chars of MD5(sorted photo IDs joined)
  photos: PhotoGroup[] // Photos in the group
  coverIndex: number   // Recommended keep index (largest file × resolution)
  avgDistance: number   // Average Hamming distance within group
}
```

Two-phase clustering: time-based pre-grouping (default 30s gap), then Union-Find by hash distance (default ≤10).

### 4.9 AnalyzeResult

```typescript
interface AnalyzeResult {
  computed: number    // Newly computed hashes
  skipped: number     // Skipped (already had hash)
  totalGroups: number // Number of clusters
  totalPhotos: number // Total photos in clusters
}
```

### 4.10 SimilarStats

```typescript
interface SimilarStats {
  analyzed: number // Photos with computed hashes
  total: number    // Total photos in folder
  groups: number   // Current cluster count
}
```

## 5. API Endpoints

All endpoints prefixed with `/api`. Vite dev proxy forwards to `http://127.0.0.1:3001`.

### 5.1 Folders

| Method | Path | Description |
|--------|------|-------------|
| GET | `/folders/browse?path=` | Browse directories. Returns drive/volume list when path is empty. Response: `{ current, parent, children[] }` |
| POST | `/folders/scan` | Scan folder. Body: `{ path }`. Response: `{ total, paired, orphanJpg, orphanRaw }` |
| GET | `/folders/subfolders?folder=` | List subfolders. Returns `SubfolderInfo[]` |

### 5.2 Photos

| Method | Path | Description |
|--------|------|-------------|
| GET | `/photos?folder=&page=&limit=&subfolder=&sort=` | List photos (paginated, default 2000). Response: `{ photos, total }`. photos include reviewAction/reviewedAt |
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
| GET | `/reviews/random/batch?folder=&count=N` | Get N unreviewed photos (count 1-100, Fisher-Yates). Response: `{ photos, total }` |

### 5.5 Stats & Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats?folder=` | Review statistics `{ total, reviewed, pending, orphanJpg, orphanRaw }` |
| GET | `/settings` | Get settings `{ random_cache_days }` |
| PUT | `/settings` | Update settings. Body: `{ random_cache_days }` |

### 5.6 Similarity Clustering

| Method | Path | Description |
|--------|------|-------------|
| POST | `/similarity/analyze` | Analyze folder for similar photos. Body: `{ folder, timeGap?, hashThreshold? }`. SSE streaming with `progress`/`complete`/`error` events |
| GET | `/similarity/groups?folder=&page=&limit=&timeGap=&hashThreshold=` | List similar groups (paginated, default 50). Response: `{ groups: SimilarGroup[], total }` |
| GET | `/similarity/stats?folder=` | Get similarity analysis stats. Response: `{ analyzed, total, groups }` |

## 6. State Management

### 6.1 Root State — AppContext

`AppContext` wraps all routes via `AppProvider` in `App.tsx`, providing globally shared data.

**State**:
- `activeFolder: string` — current active folder
- `photos: PhotoGroup[]` — all photos in the current folder (with reviewAction/reviewedAt)
- `settings: Record<string, string>` — server settings
- `isLoaded: boolean` — whether initial load is complete

**Actions**:
- `loadPhotos(folder)` — calls scanFolder + getPhotos + getSettings, sets all state

HomePage calls `loadPhotos()` then navigates to `/grid`.

### 6.2 Review Page — ReviewContext

`ReviewContext` is the core state manager for the review page (`/review`), using React Context + useState.
Depends on `useApp()` for root-level data.

**State**:
- `photos: PhotoGroup[]` — local photo list (updated immediately on delete)
- `filteredPhotos: PhotoGroup[]` — photos filtered by date, status, and subfolder
- `currentIndex: number` — current browse position
- `currentPhoto: PhotoGroup | null` — current photo
- `selectedDate: string | null` — date filter condition
- `statusFilter: StatusFilter` — review status filter ('all' | 'unreviewed' | 'reviewed')
- `subfolderFilter: string | null` — subfolder filter condition
- `subfolders: SubfolderInfo[]` — subfolder list
- `reviewedCount: number` — count of reviewed photos
- `leftSidebarOpen: boolean` — left sidebar toggle
- `rightPanelOpen: boolean` — right panel toggle
- `loading: boolean` — loading state
- `error: string` — error message
- `monthGroups: MonthGroup[]` — month/date grouping data

**Actions**:
- `goTo(index)` — jump to specified position
- `setDateFilter(date)` — set date filter (null means all)
- `setStatusFilter(filter)` — set review status filter
- `setSubfolderFilter(filter)` — set subfolder filter (also resets date and index)
- `toggleLeftSidebar()` / `toggleRightPanel()` — toggle sidebars
- `handleAction('keep' | 'deleted')` — execute review action
- `refresh()` — reload photo list

**Action Flow** (handleAction):
1. Call `api.submitReview()` to record the review
2. If action is 'deleted', call `api.deletePhoto()` to move to trash, remove from local list
3. If action is 'keep', update local photo's reviewAction/reviewedAt
4. Auto-advance to next photo

### 6.3 Date Grouping — useDateGroups

Groups photos by month→day (two-level), with status and subfolder filtering.

```typescript
useDateGroups(photos, selectedDate, statusFilter, subfolderFilter)
```

**Parameters**:
- `photos: PhotoGroup[]` — photo list
- `selectedDate: string | null` — date filter condition
- `statusFilter: StatusFilter` — 'all' | 'unreviewed' | 'reviewed'
- `subfolderFilter: string | null` — subfolder filter condition

**Returns**:
- `monthGroups: MonthGroup[]` — array of months, each containing `dates: DateGroup[]` (with reviewedCount)
- `filteredPhotos` — subset filtered by all conditions
- `dateOfIndex: Map<number, string>` — index-to-date mapping

### 6.4 Keyboard Shortcuts — useKeyboardShortcuts

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

### 6.5 Random Browse — useRandomBatch

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

### 6.6 Grid Page — GridContext

`GridContext` is the core state for the grid page (`/grid`), using React Context + useState.
Depends on `useApp()` for root-level photos and activeFolder.

**State**:
- `photos: PhotoGroup[]` — all photos in the current folder
- `filteredPhotos: PhotoGroup[]` — photos filtered by date and subfolder
- `subfolderFilter: string | null` — subfolder filter condition
- `subfolders: SubfolderInfo[]` — subfolder list
- `selectedDate: string | null` — date filter condition
- `columns: number` — grid column count (2-8, default 5)
- `dateSections: DateSection[]` — date-grouped photo sections `{ date, label, count, photos }`
- `virtualItems: VirtualItem[]` — virtualized item list (header | photo-row)
- `dateIndexMap: Map<string, number>` — date to virtual item index mapping
- `monthGroups: MonthGroup[]` — month/date grouping data
- `loading: boolean` — loading state

**Actions**:
- `setSubfolderFilter(filter)` — set subfolder filter (also resets date selection)
- `setSelectedDate(date)` — set date filter
- `setColumns(n)` — set column count
- `refresh()` — reload subfolder list
- `scrollToRef` — ref to scroll to a specific date

**Grid page components**:
- **FolderSidebar** — left subfolder tree, click to switch filter
- **YearTimeline** — right vertical date timeline, click to scroll to date
- **Lightbox** — full-screen image viewer overlay, ESC to close, arrow navigation
- **NavBar** — global navigation bar, tab-style switcher (Grid/Review/Random), shows route-specific controls

GridPage uses `@tanstack/react-virtual`'s `useVirtualizer` with overscan=8.

### 6.7 Additional Hooks

- **useExif(photo)** — lazy EXIF loading for a single photo with cancellation support. Returns `ExifData | null`
- **useDragImage(photo, onLoad?)** — drag image export. Converts img element via canvas→blob→File, attaches to dataTransfer
- **useImageZoom()** — zoom and pan management. Ctrl+wheel zoom (1x-5x), drag to pan, double-click reset. Returns `{ scale, resetZoom, zoomStyle, handleWheel, handlers }`

### 6.8 activeFolder Module-level State

`client/src/api/index.ts` maintains a module-level variable `activeFolder`,
while `AppContext` also manages this value. HomePage sets it then navigates to `/grid`.
The API layer automatically appends the `folder` parameter to requests.

### 6.9 Similar Page — SimilarContext

`SimilarContext` is the core state manager for the similar page (`/similar`), using React Context + useState.
Depends on `useApp()` for root-level activeFolder.

**State**:
- `status: 'idle' | 'analyzing' | 'done'` — analysis phase
- `result: AnalyzeResult | null` — analysis result
- `stats: SimilarStats | null` — statistics
- `progress: AnalyzeProgress | null` — SSE progress
- `groups: SimilarGroup[]` — clustered groups
- `selections: Map<groupId, Map<photoId, 'keep'|'delete'|null>>` — per-photo selection state

**Actions**:
- `analyze()` — trigger analysis (SSE streaming), load groups on completion
- `abortAnalyze()` — abort analysis
- `refreshStats()` — refresh statistics
- `toggleSelection(groupId, photoId)` — toggle single photo delete selection
- `keepRecommended(groupId)` — keep recommended photo, mark others for deletion
- `deleteAllExceptRecommended(groupId)` — same as keepRecommended
- `deleteSelected()` — batch delete all photos marked for deletion

**Recommendation strategy**: photo with highest `fileSize * 10000 + width * height` in the group is the recommended keep.

### 6.10 useStaggeredReveal

`useStaggeredReveal(staggerMs?)` uses IntersectionObserver to detect element entering viewport and trigger staggered fade-in animation on children.

**Parameter**: `staggerMs` — delay between children (default 50ms)

**Returns**: `{ ref, visible, childStyle }` — `childStyle(index)` generates a style object with `transition-delay`.

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

### 7.8 Virtualized Grid
GridPage uses `@tanstack/react-virtual` for virtualized rendering with overscan=8.
Rationale: photo grids may contain thousands of rows; only visible DOM nodes are rendered to avoid performance issues.

### 7.9 Root AppContext
AppContext provides activeFolder and photos at the top level, shared by GridPage and ReviewPage.
Rationale: scan results are loaded once and shared across pages to avoid duplicate requests.

## 8. Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend (concurrently) |
| `npm run dev:client` | Frontend only (Vite, port 5173) |
| `npm run dev:server` | Backend only (tsx watch, port 3001) |
| `npm run build` | Build both frontend and backend |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:e2e:headed` | Run E2E tests (headed mode) |
| `npm run test:photos` | Generate test photo data |
| `npm run test:visual-photos` | Generate visual test photos |
| `npm run test:visual` | Run visual regression tests |
| `npm run test:report` | Generate test report |
| `npm run test:full` | Full test pipeline (generate data + E2E + report) |
| `npm run test:visual-full` | Full visual test pipeline |
| `npm run screenshot` | Full-page screenshots (browser stays open) |
| `npm run screenshot:close` | Screenshots with browser auto-close |
