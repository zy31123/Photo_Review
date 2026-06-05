import { test, expect } from '@playwright/test'
import { scanFromHome, waitForPhotos, waitForFullImage, screenshotDir } from './helpers'

test.describe('网格浏览页', () => {
  test.beforeEach(async ({ page }) => {
    await scanFromHome(page)
  })

  test('网格默认视图', async ({ page }) => {
    await test.step('等待缩略图加载完成', async () => {
      await waitForPhotos(page)
    })

    await test.step('截图：网格默认视图', async () => {
      await page.screenshot({ path: `${screenshotDir('grid')}/default.png`, fullPage: false })
    })
  })

  test('Lightbox 打开状态', async ({ page }) => {
    await waitForPhotos(page)

    await test.step('点击第一张照片打开 Lightbox', async () => {
      const firstPhoto = page.locator('img[src*="/thumbnail"]').first()
      await firstPhoto.click()
    })

    await test.step('等待 Lightbox 大图加载', async () => {
      await waitForFullImage(page)
    })

    await test.step('截图：Lightbox', async () => {
      await page.screenshot({ path: `${screenshotDir('grid')}/lightbox.png`, fullPage: false })
    })
  })
})
