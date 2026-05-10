import { test, expect, type Page } from '@playwright/test'
import { navigateToReview } from '../helpers/navigate-to-review'

const FOLDER_DIR = 'mock-folder'

async function setupReviewPage(
  page: Page,
  options?: Parameters<typeof navigateToReview>[2],
) {
  await navigateToReview(page, FOLDER_DIR, options)
}

test.describe('Review Page', () => {
  test('redirects to home without active folder', async ({ page }) => {
    await page.goto('/review')
    await expect(page).toHaveURL('/')
  })

  test('shows photos after folder scan', async ({ page }) => {
    await setupReviewPage(page)
    await expect(page.getByTestId('review-grid')).toBeVisible({ timeout: 15000 })
  })

  test('keyboard navigation changes photo', async ({ page }) => {
    await setupReviewPage(page)
    await expect(page.getByTestId('review-grid')).toBeVisible({ timeout: 15000 })

    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(500)
  })

  test('sidebar and panel toggles work', async ({ page }) => {
    await setupReviewPage(page)
    await expect(page.getByTestId('review-grid')).toBeVisible({ timeout: 15000 })

    await page.keyboard.press('[')
    await page.waitForTimeout(300)
  })

  test('shows empty state when no photos', async ({ page }) => {
    await setupReviewPage(page, {
      scanResponse: { total: 0, paired: 0, orphanJpg: 0, orphanRaw: 0 },
      photosResponse: { photos: [], total: 0 },
    })
    await expect(page.getByText('暂无照片')).toBeVisible({ timeout: 5000 })
  })
})
