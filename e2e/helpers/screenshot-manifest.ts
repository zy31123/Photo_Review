import fs from 'fs'
import path from 'path'

const MANIFEST_PATH = path.resolve(process.cwd(), 'e2e/reports/screenshots/manifest.json')

interface ScreenshotEntry {
  file: string
  page: string
  description: string
  testName: string
}

export function resetManifest() {
  const dir = path.dirname(MANIFEST_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(MANIFEST_PATH, '[]')
}

export function addScreenshot(entry: ScreenshotEntry) {
  const dir = path.dirname(MANIFEST_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  let entries: ScreenshotEntry[] = []
  try {
    entries = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
  } catch {
    entries = []
  }

  entries.push(entry)
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(entries, null, 2))
}
