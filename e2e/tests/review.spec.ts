import { test, expect, type Page, type Route } from '@playwright/test'
import path from 'path'
import { addScreenshot } from '../helpers/screenshot-manifest'
import { TEST_PHOTOS_DIR, MOCK_PHOTOS, jsonResponse } from '../helpers/test-setup'

const SCREENSHOTS_DIR = 'e2e/reports/screenshots'

const defaultBrowseResponse = { current: TEST_PHOTOS_DIR, parent: path.dirname(TEST_PHOTOS_DIR), children: [] }
const defaultScanResponse = { total: 3, paired: 3, orphanJpg: 0, orphanRaw: 0 }
const defaultPhotosResponse = { photos: MOCK_PHOTOS, total: MOCK_PHOTOS.length }

async function setupReviewPage(
  page: Page,
  options?: {
    scanResponse?: unknown
    photosHandler?: (route: Route) => Promise<void>
    photosResponse?: unknown
  },
) {
  await page.route('**/api/folders/browse**', route =>
    route.fulfill(jsonResponse(defaultBrowseResponse)),
  )
  await page.route('**/api/folders/scan', route =>
    route.fulfill(jsonResponse(options?.scanResponse ?? defaultScanResponse)),
  )
  if (options?.photosHandler) {
    await page.route('**/api/photos**', options.photosHandler)
  } else {
    await page.route('**/api/photos**', route =>
      route.fulfill(jsonResponse(options?.photosResponse ?? defaultPhotosResponse)),
    )
  }

  await page.goto('/')
  await page.getByText('点击选择文件夹').click()
  await expect(page.getByRole('heading', { name: '选择文件夹' })).toBeVisible()
  await page.getByRole('button', { name: '选择此文件夹' }).click()
  await expect(page.getByRole('heading', { name: '选择文件夹' })).not.toBeVisible()
  await page.getByRole('button', { name: '开始审阅' }).click()
  await page.waitForURL('/review', { timeout: 10000 })
}

test.describe('Review Page', () => {
  test('redirects to home without active folder', async ({ page }) => {
    await page.goto('/review')
    await expect(page).toHaveURL('/')
  })

  test('shows photos after folder scan', async ({ page }) => {
    await setupReviewPage(page)

    await expect(page.getByTestId('review-grid')).toBeVisible({ timeout: 15000 })

    const screenshotPath = `${SCREENSHOTS_DIR}/review-with-photos.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    addScreenshot({ file: 'review-with-photos.png', page: 'Review', description: '审阅页面已加载照片', testName: 'shows photos after folder scan' })
  })

  test('toolbar is visible with back button and counter', async ({ page }) => {
    await setupReviewPage(page)
    await expect(page.getByTestId('review-grid')).toBeVisible({ timeout: 15000 })

    await expect(page.getByTestId('btn-back')).toBeVisible()
    await expect(page.getByTestId('photo-counter')).toBeVisible()
  })

  test('keyboard navigation changes photo', async ({ page }) => {
    await setupReviewPage(page)
    await expect(page.getByTestId('review-grid')).toBeVisible({ timeout: 15000 })

    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(500)

    const screenshotPath = `${SCREENSHOTS_DIR}/review-after-arrow-right.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    addScreenshot({ file: 'review-after-arrow-right.png', page: 'Review', description: '按右箭头后', testName: 'keyboard navigation' })
  })

  test('sidebar and panel toggles work', async ({ page }) => {
    await setupReviewPage(page)
    await expect(page.getByTestId('review-grid')).toBeVisible({ timeout: 15000 })

    const screenshotBefore = `${SCREENSHOTS_DIR}/review-before-toggle.png`
    await page.screenshot({ path: screenshotBefore, fullPage: true })
    addScreenshot({ file: 'review-before-toggle.png', page: 'Review', description: '切换前', testName: 'sidebar panel toggles' })

    await page.getByTestId('btn-toggle-sidebar').click()
    await page.waitForTimeout(300)

    const screenshotAfter = `${SCREENSHOTS_DIR}/review-after-toggle.png`
    await page.screenshot({ path: screenshotAfter, fullPage: true })
    addScreenshot({ file: 'review-after-toggle.png', page: 'Review', description: '切换侧栏后', testName: 'sidebar panel toggles' })
  })

  test('shows loading spinner', async ({ page }) => {
    await setupReviewPage(page, {
      photosHandler: async () => { await new Promise(() => {}) },
    })

    await expect(page.getByText('加载中...')).toBeVisible({ timeout: 5000 })

    const screenshotPath = `${SCREENSHOTS_DIR}/review-loading.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    addScreenshot({ file: 'review-loading.png', page: 'Review', description: '审阅页面加载中', testName: 'shows loading spinner' })
  })

  test('shows empty state when no photos', async ({ page }) => {
    await setupReviewPage(page, {
      scanResponse: { total: 0, paired: 0, orphanJpg: 0, orphanRaw: 0 },
      photosResponse: { photos: [], total: 0 },
    })

    await expect(page.getByText('暂无照片')).toBeVisible({ timeout: 5000 })

    const screenshotPath = `${SCREENSHOTS_DIR}/review-empty.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    addScreenshot({ file: 'review-empty.png', page: 'Review', description: '审阅页面无照片', testName: 'shows empty state when no photos' })
  })
})
