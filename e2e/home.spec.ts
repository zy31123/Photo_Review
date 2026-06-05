import { test, expect } from '@playwright/test'
import { TEST_FOLDER, injectRecentFolder, waitForPhotos, screenshotDir } from './helpers'

test.describe('首页', () => {
  test('空状态 — 无最近文件夹', async ({ page }) => {
    await page.goto('/')
    await test.step('截图：空状态', async () => {
      await expect(page.getByText('尚未打开过文件夹')).toBeVisible()
      await page.screenshot({ path: `${screenshotDir('home')}/empty.png`, fullPage: true })
    })
  })

  test('最近文件夹列表 + 扫描流程', async ({ page }) => {
    await injectRecentFolder(page)
    await page.goto('/')

    await test.step('截图：最近文件夹列表', async () => {
      const folderBtn = page.getByRole('main').getByTitle(TEST_FOLDER)
      await expect(folderBtn).toBeVisible({ timeout: 10_000 })
      await page.screenshot({ path: `${screenshotDir('home')}/with-recent.png`, fullPage: true })
    })

    await test.step('扫描文件夹并跳转到网格页', async () => {
      const folderBtn = page.getByRole('main').getByTitle(TEST_FOLDER)
      await folderBtn.click()
      await page.waitForURL('/grid', { timeout: 60_000 })
      // 等待网格页缩略图加载完成再截图
      await waitForPhotos(page)
      await page.screenshot({ path: `${screenshotDir('home')}/after-scan.png`, fullPage: true })
    })
  })
})
