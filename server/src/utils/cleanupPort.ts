import { execSync } from 'child_process'

export function killPortOccupant(port: number): void {
  try {
    const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const match = out.match(/\s+(\d+)\s*$/m)
    if (match) {
      const pid = Number(match[1])
      console.log(`[server] 端口 ${port} 被 PID ${pid} 占用，正在终止...`)
      process.kill(pid)
      const deadline = Date.now() + 3000
      while (Date.now() < deadline) {
        try {
          const check = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          })
          if (!check.trim()) break
        } catch { break }
      }
    }
  } catch {
    // 端口空闲
  }
}
