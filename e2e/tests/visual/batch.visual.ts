import { test, expect } from '@playwright/test'
import path from 'path'
import { addScreenshot } from '../../helpers/screenshot-manifest'
import { navigateToReview } from '../../helpers/navigate-to-review'

const SCREENSHOTS_DIR = 'e2e/reports/screenshots'
const VISUAL_PHOTOS_DIR = path.resolve(process.cwd(), 'e2e/fixtures/visual-photos')
const PAIRED_PHOTOS_DIR = path.resolve(process.cwd(), 'e2e/fixtures/paired-photos')

test.describe('Batch Page - Visual', () => {
  test('shows no orphans message', async ({ page }) => {
    await navigateToReview(page, PAIRED_PHOTOS_DIR)

    await page.getByTitle('批量处理').click()
    await page.waitForURL('/batch', { timeout: 10000 })
    await expect(page.getByText('没有发现孤立文件')).toBeVisible({ timeout: 10000 })

    const screenshotPath = `${SCREENSHOTS_DIR}/batch-no-orphans.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    addScreenshot({ file: 'batch-no-orphans.png', page: 'Batch', description: '批量处理无孤立文件', testName: 'shows no orphans message' })
  })

  test('shows orphan cards', async ({ page }) => {
    await navigateToReview(page, VISUAL_PHOTOS_DIR)

    await page.getByTitle('批量处理').click()
    await page.waitForURL('/batch', { timeout: 10000 })
    await expect(page.getByText('无 RAW 配对的 JPG')).toBeVisible({ timeout: 10000 })

    const screenshotPath = `${SCREENSHOTS_DIR}/batch-with-orphans.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    addScreenshot({ file: 'batch-with-orphans.png', page: 'Batch', description: '批量处理含孤立文件', testName: 'shows orphan cards' })
  })

  test('shows confirm delete modal', async ({ page }) => {
    await navigateToReview(page, VISUAL_PHOTOS_DIR)

    await page.getByTitle('批量处理').click()
    await page.waitForURL('/batch', { timeout: 10000 })
    await expect(page.getByText('无 RAW 配对的 JPG')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: '删除全部 JPG' }).click()
    await expect(page.getByRole('heading', { name: '确认删除' })).toBeVisible()

    const screenshotPath = `${SCREENSHOTS_DIR}/batch-confirm-delete.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    addScreenshot({ file: 'batch-confirm-delete.png', page: 'Batch', description: '确认删除模态框', testName: 'shows confirm delete modal' })
  })
})
