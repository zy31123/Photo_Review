import fs from 'fs'
import path from 'path'

const REPORTS_DIR = path.resolve(process.cwd(), 'e2e/reports')
const SCREENSHOTS_DIR = path.join(REPORTS_DIR, 'screenshots')

interface ScreenshotEntry {
  file: string
  page: string
  description: string
  testName: string
}

interface AnalysisEntry {
  file: string
  analysis: string
  suggestions: string[]
}

/**
 * 读取 manifest 并返回截图清单信息。
 *
 * 使用流程：
 * 1. npm run test:full          — 生成截图和 manifest.json
 * 2. npm run test:visual        — 生成视觉截图（追加到 manifest）
 * 3. 在 Claude Code 中分析截图   — 使用 MCP 图片分析工具逐张分析
 * 4. Claude Code 调用 writeAnalysis() — 安全写入 analysis.json
 * 5. npm run test:report         — 生成含 AI 分析的 HTML 报告
 *
 * 也可直接使用 CLI：
 *   npx tsx e2e/helpers/analyze-screenshots.ts           # 打印截图清单
 *   npx tsx e2e/helpers/analyze-screenshots.ts << EOF     # 粘贴分析结果
 *   EOF
 */

export function writeAnalysis(entries: AnalysisEntry[]) {
  const safe = entries.map(e => ({
    file: String(e.file || ''),
    analysis: String(e.analysis || ''),
    suggestions: Array.isArray(e.suggestions)
      ? e.suggestions.map((s: unknown) => String(s))
      : [],
  }))
  fs.writeFileSync(
    path.join(REPORTS_DIR, 'analysis.json'),
    JSON.stringify(safe, null, 2),
  )
  console.log(`已写入 ${safe.length} 条分析到 analysis.json`)
}

function main() {
  const manifestPath = path.join(SCREENSHOTS_DIR, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    console.error('错误: manifest.json 不存在，请先运行测试生成截图')
    process.exit(1)
  }

  const manifest: ScreenshotEntry[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  if (manifest.length === 0) {
    console.error('错误: manifest 为空，没有截图可分析')
    process.exit(1)
  }

  console.log(`共 ${manifest.length} 张截图待分析：\n`)

  for (const entry of manifest) {
    const filePath = path.join(SCREENSHOTS_DIR, entry.file)
    const exists = fs.existsSync(filePath)
    console.log(`[${exists ? '✓' : '✗'}] ${entry.page} | ${entry.description} | ${entry.file}`)
  }

  console.log(`\n截图目录: ${SCREENSHOTS_DIR}`)
  console.log(`分析结果: ${path.join(REPORTS_DIR, 'analysis.json')}`)
}

main()
