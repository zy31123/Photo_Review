import path from 'path'
import { expect, type Page, type Route } from '@playwright/test'

export function jsonResponse(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify(data) }
}

const MOCK_PHOTOS = [
  { id: 'mock-1', name: 'photo-paired.jpg', jpgPath: 'photo-paired.jpg', rawPaths: ['photo-paired.nef'], hasJpg: true, hasRaw: true, isOrphan: false, folder: 'mock', subfolder: '' },
  { id: 'mock-2', name: 'photo-paired2.jpg', jpgPath: 'photo-paired2.jpg', rawPaths: ['photo-paired2.cr2'], hasJpg: true, hasRaw: true, isOrphan: false, folder: 'mock', subfolder: '' },
  { id: 'mock-3', name: 'orphan-jpg.jpg', jpgPath: 'orphan-jpg.jpg', rawPaths: [], hasJpg: true, hasRaw: false, isOrphan: true, orphanType: 'jpg', folder: 'mock', subfolder: '' },
]

const defaultPhotosResponse = { photos: MOCK_PHOTOS, total: MOCK_PHOTOS.length }

export async function navigateToReview(
  page: Page,
  folderDir: string,
  options?: {
    scanResponse?: unknown
    photosHandler?: (route: Route) => Promise<void>
    photosResponse?: unknown
  },
) {
  const scanResp = options?.scanResponse ?? { total: 3, paired: 2, orphanJpg: 1, orphanRaw: 0 }
  const photosResp = options?.photosResponse ?? defaultPhotosResponse

  await page.route('**/api/folders/browse**', route =>
    route.fulfill(jsonResponse({ current: folderDir, parent: path.dirname(folderDir), children: [] })),
  )
  await page.route('**/api/folders/scan', route =>
    route.fulfill(jsonResponse(scanResp)),
  )
  await page.route('**/api/settings', route =>
    route.fulfill(jsonResponse({})),
  )
  await page.route('**/api/folders/subfolders**', route =>
    route.fulfill(jsonResponse([])),
  )

  if (options?.photosHandler) {
    await page.route('**/api/photos**', options.photosHandler)
  } else {
    await page.route('**/api/photos**', route =>
      route.fulfill(jsonResponse(photosResp)),
    )
  }

  await page.goto('/')
  await page.getByText('点击选择文件夹').click()
  await expect(page.getByRole('heading', { name: '选择文件夹' })).toBeVisible()
  await page.getByRole('button', { name: '选择此文件夹' }).click()
  await expect(page.getByRole('heading', { name: '选择文件夹' })).not.toBeVisible()
  await page.getByRole('button', { name: '开始审阅' }).click()
  await page.waitForURL('/grid', { timeout: 15000 })

  await page.getByRole('button', { name: '审阅' }).click()
  await page.waitForURL('/review', { timeout: 10000 })
}
