import type {
  PhotoGroupWithStatus,
  ReviewAction,
  ReviewMode,
  ScanResult,
  Stats,
  SubfolderInfo,
  BrowseResult,
  ExifData,
  SimilarGroup,
  AnalyzeResult,
  SimilarStats,
  AnalyzeProgress,
} from '@photo-review/shared'

// Client always works with photos that include review/rating/favorite status
export type PhotoGroup = PhotoGroupWithStatus
export type { PhotoGroupWithStatus, ReviewAction, ReviewMode, ScanResult, ExifData, SimilarGroup, AnalyzeResult, SimilarStats, AnalyzeProgress, Stats, SubfolderInfo, BrowseResult }

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
        // Parse error from response — support both { error: { message } } and { message }
        const body = await res.json().catch(() => null)
        const message = body?.error?.message || body?.message || res.statusText
        const err: any = new Error(message || `Request failed: ${res.status}`)
        err.status = res.status
        throw err
      }
      return res.json()
    } catch (e: any) {
      // Only retry on network errors or server errors (5xx). 4xx are client errors — no point retrying.
      const status: number | undefined = e.status
      const isServerError = status != null && status >= 500
      const isNetworkError = status == null && !e.status
      const isRetryable = isNetworkError || isServerError
      if (i < maxAttempts - 1 && isRetryable) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)))
        continue
      }
      throw e
    }
  }
  throw new Error('请求失败')
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
    request<{ success: boolean; trashPaths: Record<string, string> }>(`/photos/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  restorePhoto: (data: { photoId: string; trashPaths: Record<string, string>; previousReviewAction?: string | null }) =>
    request<{ success: boolean; photo: PhotoGroup }>('/photos/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  restorePhotos: (items: Array<{ photoId: string; trashPaths: Record<string, string>; previousReviewAction?: string | null }>) =>
    request<{ success: boolean; photos: PhotoGroup[] }>('/photos/restore-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    }),

  deleteReview: (photoId: string) =>
    request<{ success: boolean }>(`/reviews/${encodeURIComponent(photoId)}`, { method: 'DELETE' }),

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

  setRating: (photoId: string, rating: number) =>
    request<{ success: boolean }>(`/photos/${encodeURIComponent(photoId)}/rating`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    }),

  toggleFavorite: (photoId: string) =>
    request<{ success: boolean; favorite: boolean }>(`/photos/${encodeURIComponent(photoId)}/favorite`, {
      method: 'PUT',
    }),

  setFavorite: (photoId: string, favorite: boolean) =>
    request<{ success: boolean }>(`/photos/${encodeURIComponent(photoId)}/favorite/set`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorite }),
    }),

  analyzeSimilarStream: (
    callbacks: {
      onProgress?: (progress: AnalyzeProgress) => void
      onComplete?: (result: AnalyzeResult) => void
      onError?: (message: string) => void
    },
    params?: { timeGap?: number; strictThreshold?: number },
  ) => {
    const controller = new AbortController()
    fetch(`${BASE}/similarity/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: activeFolder, timeGap: params?.timeGap, strictThreshold: params?.strictThreshold }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          const message = body?.error?.message || body?.message || res.statusText
          callbacks.onError?.(message || `请求失败: ${res.status}`)
          return
        }
        const reader = res.body?.getReader()
        if (!reader) { callbacks.onError?.('无法读取响应流'); return }
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          let currentEvent = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7)
            } else if (line.startsWith('data: ') && currentEvent) {
              try {
                const data = JSON.parse(line.slice(6))
                if (currentEvent === 'progress') callbacks.onProgress?.(data)
                else if (currentEvent === 'complete') callbacks.onComplete?.(data)
                else if (currentEvent === 'error') callbacks.onError?.(data.message)
              } catch { /* ignore malformed data */ }
              currentEvent = ''
            }
          }
        }
      })
      .catch((e) => {
        if (e.name !== 'AbortError') callbacks.onError?.(e.message)
      })
    return () => controller.abort()
  },

  getSimilarGroups: (params?: { page?: number; limit?: number; timeGap?: number; strictThreshold?: number }) => {
    const qs = new URLSearchParams()
    qs.set('folder', activeFolder)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.timeGap) qs.set('timeGap', String(params.timeGap))
    if (params?.strictThreshold) qs.set('strictThreshold', String(params.strictThreshold))
    return request<{ groups: SimilarGroup[]; total: number }>(`/similarity/groups?${qs.toString()}`)
  },

  getSimilarStats: () =>
    request<SimilarStats>(`/similarity/stats?folder=${encodeURIComponent(activeFolder)}`),
}
