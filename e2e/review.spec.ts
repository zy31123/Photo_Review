import { test, expect } from '@playwright/test'
import { scanFromHome, waitForPhotos, waitForFullImage, navigateViaNavBar, screenshotDir } from './helpers'

test.describe('审阅页', () => {
  test.beforeEach(async ({ page }) => {
    await scanFromHome(page)
    await waitForPhotos(page)
    await navigateViaNavBar(page, '顺序审阅')
  })

  test('审阅页默认状态', async ({ page }) => {
    await test.step('等待审阅页图片加载', async () => {
      await waitForFullImage(page)
    })

    await test.step('截图：审阅页默认状态', async () => {
      await page.screenshot({ path: `${screenshotDir('review')}/default.png`, fullPage: false })
    })
  })

  test('审阅操作 — 接受照片', async ({ page }) => {
    await waitForFullImage(page)

    await test.step('点击接受按钮（保留）', async () => {
      const acceptBtn = page.locator('button[aria-label="保留"], button:has-text("保留")').first()
      if (await acceptBtn.isVisible().catch(() => false)) {
        await acceptBtn.click()
        await page.waitForTimeout(500)
      }
    })

    await test.step('等待操作后的图片加载', async () => {
      await waitForFullImage(page)
    })

    await test.step('截图：审阅操作后', async () => {
      await page.screenshot({ path: `${screenshotDir('review')}/after-action.png`, fullPage: false })
    })
  })
})
