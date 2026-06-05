import { test, expect } from '@playwright/test'
import { scanFromHome, waitForPhotos, waitForFullImage, navigateViaNavBar, screenshotDir } from './helpers'

test.describe('随机浏览页', () => {
  test.beforeEach(async ({ page }) => {
    await scanFromHome(page)
    await waitForPhotos(page)
    await navigateViaNavBar(page, '随机浏览')
  })

  test('随机浏览默认视图', async ({ page }) => {
    await test.step('点击开始审阅按钮', async () => {
      const startBtn = page.locator('button:has-text("开始")').first()
      if (await startBtn.isVisible().catch(() => false)) {
        await startBtn.click()
      }
    })

    await test.step('等待随机照片加载', async () => {
      await waitForFullImage(page, 20_000)
    })

    await test.step('截图：随机浏览', async () => {
      await page.screenshot({ path: `${screenshotDir('random')}/default.png`, fullPage: false })
    })
  })
})
