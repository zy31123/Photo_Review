const BASE = '/api'

let activeFolder = ''

export function setActiveFolder(folder: string) {
  activeFolder = folder
}

export function getActiveFolder(): string {
  return activeFolder
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `Request failed: ${res.status}`)
  }
  return res.json()
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

export const api = {
  browseFolders: (dirPath?: string) =>
    request<BrowseResult>(`/folders/browse${dirPath ? `?path=${encodeURIComponent(dirPath)}` : ''}`),

  scanFolder: (folderPath: string) =>
    request<ScanResult>(`/folders/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: folderPath }),
    }),

  getPhotos: (params?: { sort?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    qs.set('folder', activeFolder)
    if (params?.sort) qs.set('sort', params.sort)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
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

  submitReview: (photoId: string, action: 'keep' | 'deleted', mode: 'sequential' | 'random') =>
    request<{ success: boolean }>('/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId, action, mode }),
    }),

  getRandomPhoto: () =>
    request<PhotoGroup | null>(`/reviews/random?folder=${encodeURIComponent(activeFolder)}`),

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
}
