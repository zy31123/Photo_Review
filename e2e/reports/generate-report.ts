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

interface TestResult {
  suites: Suite[]
}

interface Suite {
  title: string
  specs: Spec[]
  suites?: Suite[]
}

interface Spec {
  title: string
  ok: boolean
  tests: { results: { status: string; error?: { message: string } }[] }[]
}

function loadJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

function collectSpecs(suites: Suite[]): { title: string; ok: boolean }[] {
  const specs: { title: string; ok: boolean }[] = []
  for (const suite of suites) {
    for (const spec of suite.specs || []) {
      const ok = spec.tests?.some(t => t.results?.some(r => r.status === 'passed')) ?? false
      specs.push({ title: spec.title, ok })
    }
    if (suite.suites) specs.push(...collectSpecs(suite.suites))
  }
  return specs
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function generate() {
  const results = loadJson<TestResult>(path.join(REPORTS_DIR, 'results.json'))
  const manifest = loadJson<ScreenshotEntry[]>(path.join(SCREENSHOTS_DIR, 'manifest.json'))
  const analysis = loadJson<AnalysisEntry[]>(path.join(REPORTS_DIR, 'analysis.json'))

  const allSpecs = results ? collectSpecs(results.suites || []) : []
  const passed = allSpecs.filter(s => s.ok).length
  const total = allSpecs.length

  const screenshotsByPage = new Map<string, ScreenshotEntry[]>()
  if (manifest) {
    for (const entry of manifest) {
      const list = screenshotsByPage.get(entry.page) || []
      list.push(entry)
      screenshotsByPage.set(entry.page, list)
    }
  }

  const analysisByFile = new Map<string, AnalysisEntry>()
  if (analysis) {
    for (const entry of analysis) {
      analysisByFile.set(entry.file, entry)
    }
  }

  const timestamp = new Date().toLocaleString('zh-CN')

  const specRows = allSpecs.map(s => `
    <tr>
      <td class="status ${s.ok ? 'pass' : 'fail'}">${s.ok ? '✓' : '✗'}</td>
      <td>${escapeHtml(s.title)}</td>
    </tr>`).join('')

  const screenshotSections = Array.from(screenshotsByPage.entries()).map(([page, entries]) => `
    <div class="section">
      <h2>${escapeHtml(page)} 页面截图</h2>
      ${entries.map(e => {
        const screenshotFile = path.join('screenshots', e.file)
        const exists = fs.existsSync(path.join(SCREENSHOTS_DIR, e.file))
        const ai = analysisByFile.get(e.file)
        return `
        <div class="screenshot-card">
          <div class="screenshot-meta">
            <span class="test-name">${escapeHtml(e.testName)}</span>
            <span class="description">${escapeHtml(e.description)}</span>
          </div>
          ${exists ? `<img src="${screenshotFile}" alt="${escapeHtml(e.description)}" />` : '<p class="error">截图文件未找到</p>'}
          ${ai ? `
            <div class="ai-analysis">
              <h3>AI 分析</h3>
              <p>${escapeHtml(ai.analysis)}</p>
              ${ai.suggestions?.length ? `
                <ul>${ai.suggestions.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
              ` : ''}
            </div>` : ''}
        </div>`
      }).join('')}
    </div>`).join('')

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1920">
  <title>Photo Review - 测试报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0b; color: #e5e5e5; padding: 40px; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; color: #fafafa; }
    h2 { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #e5e5e5; border-bottom: 1px solid #2a2a2e; padding-bottom: 8px; }
    h3 { font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #a0a0a0; }
    .meta { color: #71717a; font-size: 14px; margin-bottom: 32px; }
    .summary { display: flex; gap: 24px; margin-bottom: 32px; }
    .stat { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px 28px; min-width: 140px; }
    .stat-value { font-size: 32px; font-weight: 700; }
    .stat-label { font-size: 13px; color: #71717a; margin-top: 4px; }
    .pass { color: #22c55e; }
    .fail { color: #ef4444; }
    .section { margin-bottom: 40px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { text-align: left; padding: 10px 16px; border-bottom: 1px solid #27272a; }
    th { font-size: 12px; text-transform: uppercase; color: #71717a; letter-spacing: 0.5px; }
    td.status { font-size: 18px; font-weight: 700; width: 40px; }
    .screenshot-card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
    .screenshot-meta { padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
    .test-name { font-weight: 600; font-size: 14px; }
    .description { font-size: 13px; color: #71717a; }
    .screenshot-card img { width: 100%; display: block; border-top: 1px solid #27272a; }
    .ai-analysis { padding: 16px; background: #1c1c20; border-top: 1px solid #27272a; }
    .ai-analysis h3 { color: #a78bfa; }
    .ai-analysis p { font-size: 14px; line-height: 1.6; margin-bottom: 8px; }
    .ai-analysis ul { padding-left: 20px; }
    .ai-analysis li { font-size: 14px; line-height: 1.6; color: #d4d4d8; }
    .error { color: #ef4444; padding: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Photo Review - 测试报告</h1>
    <p class="meta">生成时间：${timestamp}</p>

    <div class="summary">
      <div class="stat">
        <div class="stat-value">${total}</div>
        <div class="stat-label">总测试数</div>
      </div>
      <div class="stat">
        <div class="stat-value pass">${passed}</div>
        <div class="stat-label">通过</div>
      </div>
      <div class="stat">
        <div class="stat-value fail">${total - passed}</div>
        <div class="stat-label">失败</div>
      </div>
      <div class="stat">
        <div class="stat-value">${manifest?.length ?? 0}</div>
        <div class="stat-label">截图数</div>
      </div>
    </div>

    <div class="section">
      <h2>测试结果</h2>
      <table>
        <thead><tr><th>状态</th><th>测试名称</th></tr></thead>
        <tbody>${specRows}</tbody>
      </table>
    </div>

    ${screenshotSections}

    ${analysisByFile.size > 0 ? '' : `
    <div class="section">
      <h2>AI 分析</h2>
      <p class="meta">尚未进行 AI 分析。在 Claude Code 中运行"分析测试截图"以获取 AI 建议。</p>
    </div>`}
  </div>
</body>
</html>`

  const outputPath = path.join(REPORTS_DIR, 'report.html')
  fs.writeFileSync(outputPath, html)
  console.log(`Report generated: ${outputPath}`)
}

generate()
