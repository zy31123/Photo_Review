import { test, expect } from '@playwright/test'
import { resetManifest, addScreenshot } from '../helpers/screenshot-manifest'

const SCREENSHOTS_DIR = 'e2e/reports/screenshots'

test.describe('Home Page', () => {
  test.beforeAll(() => {
    resetManifest()
  })

  test('displays title and folder input on load', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('h1')).toContainText('Photo Review')
    await expect(page.getByText('点击选择文件夹')).toBeVisible()
    await expect(page.getByRole('button', { name: '开始审阅' })).toBeVisible()
    await expect(page.getByText('批量处理')).toBeVisible()
    await expect(page.getByText('随机浏览')).toBeVisible()

    const screenshotPath = `${SCREENSHOTS_DIR}/home-initial.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    addScreenshot({ file: 'home-initial.png', page: 'Home', description: '首页初始状态', testName: 'displays title and folder input' })
  })

  test('folder picker opens when clicking input', async ({ page }) => {
    await page.route('**/api/folders/browse**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ current: 'C:\\', parent: null, children: [] }),
      })
    })

    await page.goto('/')

    await page.getByText('点击选择文件夹').click()

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

    await page.getByText('点击选择文件夹').click()
    await expect(page.getByRole('heading', { name: '选择文件夹' })).toBeVisible()

    await page.getByRole('button', { name: '取消' }).click()
    await expect(page.getByRole('heading', { name: '选择文件夹' })).not.toBeVisible()
  })

  test('navigates to batch page', async ({ page }) => {
    await page.goto('/')

    await page.getByText('批量处理').click()
    await expect(page).toHaveURL('/batch')
  })

  test('navigates to random page', async ({ page }) => {
    await page.goto('/')

    await page.getByText('随机浏览').click()
    await expect(page).toHaveURL('/random')
  })
})
