export type ReviewAction = 'keep' | 'deleted'
export type ReviewMode = 'sequential' | 'random'

const BASE = '/api'

let activeFolder = ''

export function setActiveFolder(folder: string) {
  activeFolder = folder
}

export function getActiveFolder(): string {
  return activeFolder
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const maxAttempts = 3
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE}${path}`, options)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(err.message || `Request failed: ${res.status}`)
      }
      return res.json()
    } catch (e: any) {
      const isRetryable = !options?.method || options.method === 'GET'
      if (i < maxAttempts - 1 && isRetryable) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)))
        continue
      }
      throw e
    }
  }
  throw new Error('请求失败')
}

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
  reviewAction?: 'keep' | 'deleted' | null
  reviewedAt?: string | null
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

export interface SubfolderInfo {
  name: string
  path: string
  count: number
}

export interface BrowseResult {
  current: string
  parent: string | null
  children: { name: string; path: string }[]
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

export const api = {
  browseFolders: (dirPath?: string) =>
    request<BrowseResult>(`/folders/browse${dirPath != null ? `?path=${encodeURIComponent(dirPath)}` : ''}`),

  scanFolder: (folderPath: string) =>
    request<ScanResult>(`/folders/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: folderPath }),
    }),

  getSubfolders: () =>
    request<SubfolderInfo[]>(`/folders/subfolders?folder=${encodeURIComponent(activeFolder)}`),

  getPhotos: (params?: { sort?: string; page?: number; limit?: number; subfolder?: string }) => {
    const qs = new URLSearchParams()
    qs.set('folder', activeFolder)
    if (params?.sort) qs.set('sort', params.sort)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.subfolder) qs.set('subfolder', params.subfolder)
    return request<{ photos: PhotoGroup[]; total: number }>(`/photos?${qs.toString()}`)
  },

  deletePhoto: (id: string) =>
    request<{ success: boolean }>(`/photos/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getOrphaned: () =>
    request<{ jpg: PhotoGroup[]; raw: PhotoGroup[] }>(`/batch/orphaned?folder=${encodeURIComponent(activeFolder)}`),

  deleteOrphaned: (type: 'jpg' | 'raw') =>
    request<{ success: boolean; deleted: number }>('/batch/orphaned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, folder: activeFolder }),
    }),

  submitReview: (photoId: string, action: ReviewAction, mode: ReviewMode) =>
    request<{ success: boolean }>('/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId, action, mode }),
    }),

  getRandomPhoto: () =>
    request<PhotoGroup | null>(`/reviews/random?folder=${encodeURIComponent(activeFolder)}`),

  getRandomPhotos: (count: number) =>
    request<{ photos: PhotoGroup[]; total: number }>(`/reviews/random/batch?folder=${encodeURIComponent(activeFolder)}&count=${count}`),

  getStats: () =>
    request<Stats>(`/stats?folder=${encodeURIComponent(activeFolder)}`),

  getSettings: () =>
    request<Record<string, string>>('/settings'),

  updateSettings: (settings: Record<string, string>) =>
    request<{ success: boolean }>('/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }),

  thumbnailUrl: (id: string) => `/api/photos/${encodeURIComponent(id)}/thumbnail`,
  fullUrl: (id: string) => `/api/photos/${encodeURIComponent(id)}/full`,

  getExif: (id: string) =>
    request<ExifData | null>(`/photos/${encodeURIComponent(id)}/exif`),
}
