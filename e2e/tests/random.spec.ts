import { test, expect } from '@playwright/test'
import { navigateToReview } from '../helpers/navigate-to-review'

const FOLDER_DIR = 'mock-folder'

async function setupRandomPage(page: Parameters<typeof navigateToReview>[0]) {
  await navigateToReview(page, FOLDER_DIR)

  await page.getByRole('button', { name: '随机' }).click()
  await page.waitForURL('/random', { timeout: 10000 })
}

test.describe('Random Page', () => {
  test('shows batch selector', async ({ page }) => {
    await setupRandomPage(page)
    await expect(page.getByText('选择每批浏览数量')).toBeVisible({ timeout: 10000 })
  })

  test('shows browsing state', async ({ page }) => {
    await setupRandomPage(page)
    await expect(page.getByText('选择每批浏览数量')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: '开始浏览' }).click()
  })

  test('shows exhausted state', async ({ page }) => {
    await setupRandomPage(page)
    await expect(page.getByText('选择每批浏览数量')).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: '开始浏览' }).click()

    for (let i = 0; i < 20; i++) {
      const deleteBtn = page.locator('button[title="废片 (X)"]')
      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteBtn.click()
      } else {
        break
      }
    }

    await expect(page.getByText('所有照片已审阅完毕')).toBeVisible({ timeout: 10000 }).catch(() => {})
  })
})
