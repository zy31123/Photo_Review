import { test, expect } from '@playwright/test'
import { navigateToReview, jsonResponse } from '../helpers/navigate-to-review'

const FOLDER_DIR = 'mock-folder'
const EMPTY_BATCH = { photos: [], total: 0 }

async function setupRandomPage(page: Parameters<typeof navigateToReview>[0]) {
  await navigateToReview(page, FOLDER_DIR)

  await page.route('**/api/reviews/random/batch**', route =>
    route.fulfill(jsonResponse(EMPTY_BATCH)),
  )

  await page.getByRole('button', { name: '随机' }).click()
  await page.waitForURL('/random', { timeout: 10000 })
}

test.describe('Random Page', () => {
  test('shows batch selector', async ({ page }) => {
    await setupRandomPage(page)
    await expect(page.getByText('选择每批浏览数量')).toBeVisible({ timeout: 10000 })
  })

  test('transitions away from batch selector after clicking start', async ({ page }) => {
    await setupRandomPage(page)
    await expect(page.getByText('选择每批浏览数量')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: '开始浏览' }).click()
    await expect(page.getByText('选择每批浏览数量')).not.toBeVisible({ timeout: 10000 })
  })

  test('shows exhausted state when no photos available', async ({ page }) => {
    await setupRandomPage(page)
    await expect(page.getByText('选择每批浏览数量')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: '开始浏览' }).click()
    await expect(page.getByText('暂无可用的照片')).toBeVisible({ timeout: 10000 })
  })
})
