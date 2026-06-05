import { Page, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

export const TEST_FOLDER = 'E:\\Photos'

const SCREENSHOT_BASE = 'e2e/screenshots'

/** 生成截图路径并确保目录存在 */
export function screenshotDir(pageName: string): string {
  const dir = path.join(SCREENSHOT_BASE, pageName)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** 在页面加载前注入 localStorage，使首页显示 E:\Photos 为最近文件夹 */
export async function injectRecentFolder(page: Page) {
  await page.addInitScript((folder) => {
    localStorage.setItem('photo-review:recent-folders', JSON.stringify([folder]))
  }, TEST_FOLDER)
}

/** 从首页扫描 E:\Photos 并等待到达 /grid */
export async function scanFromHome(page: Page) {
  await injectRecentFolder(page)
  await page.goto('/')

  // 点击 E:\Photos 的最近文件夹卡片（侧栏和主内容区各有一个，取主内容区的）
  const folderBtn = page.getByRole('main').getByTitle(TEST_FOLDER)
  await expect(folderBtn).toBeVisible({ timeout: 10_000 })
  await folderBtn.click()

  // 等待扫描完成并跳转到 /grid
  await page.waitForURL('/grid', { timeout: 60_000 })
}

/**
 * 等待照片缩略图出现并完全加载（非仅 DOM 挂载）。
 * 策略：等 img 元素出现 → 等待所有可见缩略图的 naturalWidth > 0（表示图片已解码）→ 等网络空闲。
 */
export async function waitForPhotos(page: Page, timeout = 30_000) {
  // 1. 等 DOM 中出现缩略图元素
  await page.waitForSelector('img[src*="/thumbnail"]', { timeout })

  // 2. 等待可见区域内的缩略图实际加载完成
  await page.waitForFunction(
    (selector) => {
      const imgs = document.querySelectorAll<HTMLImageElement>(selector)
      if (imgs.length === 0) return false
      // 检查前几张（视口内可见的）是否加载完成
      const visible = Array.from(imgs).slice(0, 30)
      return visible.every(img => img.complete && img.naturalWidth > 0)
    },
    'img[src*="/thumbnail"]',
    { timeout },
  )

  // 3. 等网络请求空闲（缩略图传输完毕）
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {
    // networkidle 超时不致命，继续截图
  })
}

/**
 * 等待单张大图（full image）加载完成，用于审阅页、随机页等。
 */
export async function waitForFullImage(page: Page, timeout = 15_000) {
  await page.waitForSelector('img[src*="/full"]', { timeout }).catch(() => {
    // 某些页面可能只用 thumbnail
  })
  await page.waitForFunction(
    () => {
      const img = document.querySelector<HTMLImageElement>('img[src*="/full"]')
        || document.querySelector<HTMLImageElement>('img[src*="/thumbnail"]')
      return img && img.complete && img.naturalWidth > 0
    },
    { timeout },
  )
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
}

/** 通过 NavBar 点击导航到指定页面（保持 React Context 不丢失） */
export async function navigateViaNavBar(page: Page, label: string) {
  const navBtn = page.getByRole('button', { name: label, exact: false })
  await navBtn.click()
  await page.waitForTimeout(500)
}
