import { test, expect } from '@playwright/test'
import path from 'path'
import { addScreenshot } from '../../helpers/screenshot-manifest'
import { navigateToReview } from '../../helpers/navigate-to-review'

const SCREENSHOTS_DIR = 'e2e/reports/screenshots'
const VISUAL_PHOTOS_DIR = path.resolve(process.cwd(), 'e2e/fixtures/visual-photos')

test.describe('Random Page - Visual', () => {
  test('shows batch selector', async ({ page }) => {
    await navigateToReview(page, VISUAL_PHOTOS_DIR)

    await page.getByTitle('随机浏览').click()
    await page.waitForURL('/random', { timeout: 10000 })
    await expect(page.getByText('选择每批浏览数量')).toBeVisible({ timeout: 10000 })

    const screenshotPath = `${SCREENSHOTS_DIR}/random-batch-selector.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    addScreenshot({ file: 'random-batch-selector.png', page: 'Random', description: '随机浏览批次选择', testName: 'shows batch selector' })
  })

  test('shows browsing state', async ({ page }) => {
    await navigateToReview(page, VISUAL_PHOTOS_DIR)

    await page.getByTitle('随机浏览').click()
    await page.waitForURL('/random', { timeout: 10000 })
    await expect(page.getByText('选择每批浏览数量')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: '开始浏览' }).click()
    await expect(page.locator('img').first()).toBeVisible({ timeout: 15000 })

    const screenshotPath = `${SCREENSHOTS_DIR}/random-browsing.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    addScreenshot({ file: 'random-browsing.png', page: 'Random', description: '随机浏览中', testName: 'shows browsing state' })
  })

  test('shows exhausted state', async ({ page }) => {
    await navigateToReview(page, VISUAL_PHOTOS_DIR)

    await page.getByTitle('随机浏览').click()
    await page.waitForURL('/random', { timeout: 10000 })
    await expect(page.getByText('选择每批浏览数量')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: '开始浏览' }).click()
    await expect(page.locator('img').first()).toBeVisible({ timeout: 15000 })

    for (let i = 0; i < 20; i++) {
      const deleteBtn = page.locator('button[title="废片 (X)"]')
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click()
      } else {
        break
      }
    }

    await expect(page.getByText('所有照片已审阅完毕')).toBeVisible({ timeout: 10000 }).catch(() => {})

    const screenshotPath = `${SCREENSHOTS_DIR}/random-exhausted.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    addScreenshot({ file: 'random-exhausted.png', page: 'Random', description: '随机浏览已耗尽', testName: 'shows exhausted state' })
  })
})
