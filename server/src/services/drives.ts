import fs from 'fs'
import { execSync } from 'child_process'

export function isWindowsDriveRoot(p: string): boolean {
  return process.platform === 'win32' && /^[A-Za-z]:\\$/.test(p)
}

let cachedDrives: string[] | null = null
let drivesCacheTime = 0
const DRIVES_CACHE_TTL = 30_000

export function getWindowsDrives(): string[] {
  if (cachedDrives && Date.now() - drivesCacheTime < DRIVES_CACHE_TTL) return cachedDrives
  try {
    const result = execSync(
      'powershell -Command "Get-PSDrive -PSProvider FileSystem | Select-Object -ExpandProperty Root"',
      { encoding: 'utf-8', timeout: 5000 }
    )
    cachedDrives = result
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && /^[A-Za-z]:\\$/i.test(line))
    drivesCacheTime = Date.now()
    return cachedDrives
  } catch {
    return ['C:\\']
  }
}

export function getMacVolumes(): { name: string; path: string }[] {
  const volumes: { name: string; path: string }[] = [
    { name: 'Macintosh HD (系统盘)', path: '/' },
  ]
  try {
    const entries = fs.readdirSync('/Volumes', { withFileTypes: true })
    for (const e of entries) {
      if (e.isDirectory() && e.name !== 'Macintosh HD') {
        volumes.push({ name: e.name, path: `/Volumes/${e.name}` })
      }
    }
  } catch {
    // /Volumes not accessible
  }
  return volumes
}
