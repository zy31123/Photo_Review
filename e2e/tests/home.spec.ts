import { test, expect } from '@playwright/test'
import { resetManifest, addScreenshot } from '../helpers/screenshot-manifest'
import { jsonResponse } from '../helpers/test-setup'

const SCREENSHOTS_DIR = 'e2e/reports/screenshots'

test.describe('Home Page', () => {
  test.beforeAll(() => {
    resetManifest()
  })

  test('displays title and folder input on load', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('h1')).toContainText('Photo Review')
    await expect(page.getByText('点击选择文件夹...')).toBeVisible()
    await expect(page.getByRole('button', { name: '开始审阅' })).toBeVisible()
    await expect(page.getByRole('button', { name: '浏览' })).toBeVisible()

    const screenshotPath = `${SCREENSHOTS_DIR}/home-initial.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    addScreenshot({ file: 'home-initial.png', page: 'Home', description: '首页初始状态', testName: 'displays title and folder input' })
  })

  test('folder picker opens when clicking input', async ({ page }) => {
    await page.route('**/api/folders/browse**', route =>
      route.fulfill(jsonResponse({ current: 'C:\\', parent: null, children: [] }))
    )

    await page.goto('/')

    await page.getByText('点击选择文件夹...').click()

    await expect(page.getByRole('heading', { name: '选择文件夹' })).toBeVisible()
    await expect(page.getByText('当前路径')).toBeVisible()
    await expect(page.getByRole('button', { name: '选择此文件夹' })).toBeVisible()
    await expect(page.getByRole('button', { name: '取消' })).toBeVisible()

    const screenshotPath = `${SCREENSHOTS_DIR}/home-folder-picker-open.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    addScreenshot({ file: 'home-folder-picker-open.png', page: 'Home', description: '文件夹选择器打开', testName: 'folder picker opens' })
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

    const screenshotPath = `${SCREENSHOTS_DIR}/home-loading.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    addScreenshot({ file: 'home-loading.png', page: 'Home', description: '首页加载中状态', testName: 'shows loading state when scanning' })
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

    const screenshotPath = `${SCREENSHOTS_DIR}/home-error.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    addScreenshot({ file: 'home-error.png', page: 'Home', description: '首页错误状态', testName: 'shows error state on scan failure' })
  })

})
