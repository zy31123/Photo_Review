import { test, expect } from '@playwright/test'
import { scanFromHome, waitForPhotos, navigateViaNavBar } from './helpers'

test.describe('相似聚类页', () => {
  test.beforeEach(async ({ page }) => {
    await scanFromHome(page)
    await waitForPhotos(page)
    await navigateViaNavBar(page, '相似聚类')
  })

  test('相似分析页默认状态', async ({ page }) => {
    await test.step('截图：相似分析页（未分析）', async () => {
      await page.screenshot({ path: 'e2e/screenshots/similar-idle.png', fullPage: false })
    })
  })

  test('触发相似分析', async ({ page }) => {
    await test.step('点击开始分析按钮', async () => {
      const analyzeBtn = page.locator('button:has-text("分析"), button:has-text("开始")').first()
      if (await analyzeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await analyzeBtn.click()
      }
    })

    await test.step('等待分析完成', async () => {
      // 等待分析进度条消失或结果出现
      await page.waitForFunction(
        () => {
          // 分析完成后不再显示 spinner
          const spinner = document.querySelector('.animate-spin')
          return !spinner
        },
        { timeout: 60_000 },
      ).catch(() => {
        // 超时也继续截图
      })
    })

    await test.step('截图：相似分析结果', async () => {
      // 等待可能的缩略图加载
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
      await page.screenshot({ path: 'e2e/screenshots/similar-result.png', fullPage: false })
    })
  })
})
