import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function findPidOnPort(port: number): Promise<number | null> {
  try {
    const { stdout } = await execPromise('netstat -ano | findstr LISTENING')
    for (const line of stdout.split('\n')) {
      const match = line.match(/:(\d+)\s+.*LISTENING\s+(\d+)/)
      if (match && Number(match[1]) === port) {
        return Number(match[2])
      }
    }
  } catch {
    // 端口空闲
  }
  return null
}

export async function killPortOccupant(port: number): Promise<void> {
  const pid = await findPidOnPort(port)
  if (pid === null) return

  console.log(`[server] 端口 ${port} 被 PID ${pid} 占用，正在终止...`)
  try { process.kill(pid) } catch { return }

  // 等待进程退出，最多 3 秒
  const deadline = Date.now() + 3000
  while (Date.now() < deadline) {
    await delay(200)
    const still = await findPidOnPort(port)
    if (still === null) return
  }
  console.warn(`[server] 端口 ${port} 在 3 秒内仍未释放，PID ${pid} 可能仍在运行`)
}
