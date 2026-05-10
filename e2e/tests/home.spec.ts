import { test, expect } from '@playwright/test'

function jsonResponse(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify(data) }
}

test.describe('Home Page', () => {
  test('displays title and folder input on load', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('h1')).toContainText('Photo Review')
    await expect(page.getByText('点击选择文件夹...')).toBeVisible()
    await expect(page.getByRole('button', { name: '开始审阅' })).toBeVisible()
    await expect(page.getByRole('button', { name: '浏览' })).toBeVisible()
  })

  test('folder picker opens when clicking input', async ({ page }) => {
    await page.route('**/api/folders/browse**', route =>
      route.fulfill(jsonResponse({ current: 'C:\\', parent: null, children: [] }))
    )

    await page.goto('/')

    await page.getByText('点击选择文件夹...').click()

    await expect(page.getByRole('heading', { name: '选择文件夹' })).toBeVisible()
    await expect(page.getByText('此电脑')).toBeVisible()
    await expect(page.getByRole('button', { name: '选择此文件夹' })).toBeVisible()
    await expect(page.getByRole('button', { name: '取消' })).toBeVisible()
  })

  test('folder picker closes when clicking cancel', async ({ page }) => {
    await page.goto('/')

    await page.getByText('点击选择文件夹...').click()
    await expect(page.getByRole('heading', { name: '选择文件夹' })).toBeVisible()

    await page.getByRole('button', { name: '取消' }).click()
    await expect(page.getByRole('heading', { name: '选择文件夹' })).not.toBeVisible()
  })

  test('shows loading state when scanning', async ({ page }) => {
    await page.route('**/api/folders/browse**', route =>
      route.fulfill(jsonResponse({ current: 'C:\\TestPhotos', parent: 'C:\\', children: [] }))
    )
    await page.route('**/api/folders/scan', async route => {
      await new Promise(() => {})
    })

    await page.goto('/')

    await page.getByText('点击选择文件夹...').click()
    await expect(page.getByRole('heading', { name: '选择文件夹' })).toBeVisible()
    await page.getByRole('button', { name: '选择此文件夹' }).click()
    await expect(page.getByRole('heading', { name: '选择文件夹' })).not.toBeVisible()

    await page.getByRole('button', { name: '开始审阅' }).click()
    await expect(page.getByRole('button', { name: '扫描中...' })).toBeVisible()
  })

  test('shows error state on scan failure', async ({ page }) => {
    await page.route('**/api/folders/browse**', route =>
      route.fulfill(jsonResponse({ current: 'C:\\TestPhotos', parent: 'C:\\', children: [] }))
    )
    await page.route('**/api/folders/scan', route =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: '扫描失败：文件夹不存在' }) })
    )

    await page.goto('/')

    await page.getByText('点击选择文件夹...').click()
    await expect(page.getByRole('heading', { name: '选择文件夹' })).toBeVisible()
    await page.getByRole('button', { name: '选择此文件夹' }).click()
    await expect(page.getByRole('heading', { name: '选择文件夹' })).not.toBeVisible()

    await page.getByRole('button', { name: '开始审阅' }).click()
    await expect(page.getByText(/扫描失败/)).toBeVisible()
  })
})
