import path from 'path'
import { expect, type Page, type Route } from '@playwright/test'
import { jsonResponse } from './test-setup'

export async function navigateToReview(
  page: Page,
  folderDir: string,
  options?: {
    scanResponse?: unknown
    photosHandler?: (route: Route) => Promise<void>
    photosResponse?: unknown
  },
) {
  await page.route('**/api/folders/browse**', route =>
    route.fulfill(jsonResponse({ current: folderDir, parent: path.dirname(folderDir), children: [] })),
  )
  await page.route('**/api/folders/scan', route =>
    route.fulfill(jsonResponse(options?.scanResponse ?? { total: 3, paired: 3, orphanJpg: 0, orphanRaw: 0 })),
  )
  if (options?.photosHandler) {
    await page.route('**/api/photos**', options.photosHandler)
  } else if (options?.photosResponse) {
    await page.route('**/api/photos**', route =>
      route.fulfill(jsonResponse(options.photosResponse)),
    )
  }

  await page.goto('/')
  await page.getByText('点击选择文件夹').click()
  await expect(page.getByRole('heading', { name: '选择文件夹' })).toBeVisible()
  await page.getByRole('button', { name: '选择此文件夹' }).click()
  await expect(page.getByRole('heading', { name: '选择文件夹' })).not.toBeVisible()
  await page.getByRole('button', { name: '开始审阅' }).click()
  await page.waitForURL('/review', { timeout: 15000 })
}
