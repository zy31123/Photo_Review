// --- Core DTO types shared between client and server ---

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

export type ReviewAction = 'keep' | 'deleted'

export interface PhotoGroupWithStatus extends PhotoGroup {
  reviewAction?: ReviewAction | null
  reviewedAt?: string | null
  rating?: number
  favorite?: boolean
}

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

export interface SubfolderInfo {
  name: string
  path: string
  count: number
}

export interface SimilarGroup {
  id: string
  photos: PhotoGroupWithStatus[]
  coverIndex: number
  avgDistance: number
}

export interface AnalyzeResult {
  computed: number
  skipped: number
  totalGroups: number
  totalPhotos: number
}

export interface SimilarStats {
  analyzed: number
  total: number
  groups: number
}

export interface ScanResult {
  total: number
  paired: number
  orphanJpg: number
  orphanRaw: number
}

export interface Stats {
  total: number
  reviewed: number
  pending: number
  orphanJpg: number
  orphanRaw: number
}

export interface BrowseResult {
  current: string
  parent: string | null
  children: { name: string; path: string }[]
}

export interface AnalyzeProgress {
  current: number
  total: number
}

export type ReviewMode = 'sequential' | 'random'
