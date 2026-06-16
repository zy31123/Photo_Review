import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { z } from 'zod'
import { scanFolder } from '../services/scanner.js'
import { getSubfolders } from '../services/photoStore.js'
import { getWindowsDrives, getMacVolumes, isWindowsDriveRoot } from '../services/drives.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validate } from '../middleware/validate.js'
import { ForbiddenError } from '../middleware/errorHandler.js'
import { isPathAllowed } from '../utils/security.js'

const router = Router()

// Browse directories
router.get('/browse', (req, res) => {
  const dir = req.query.path as string

  // Virtual root: list available drives/volumes
  if (dir === '') {
    if (process.platform === 'win32') {
      const drives = getWindowsDrives()
      return res.json({
        current: '',
        parent: null,
        children: drives.map(d => ({ name: d, path: d })),
      })
    } else {
      return res.json({
        current: '',
        parent: null,
        children: getMacVolumes(),
      })
    }
  }

  const targetDir = (dir || os.homedir()).replace(/[A-Za-z]:$/, '$&\\')

  if (!isPathAllowed(targetDir)) {
    throw new ForbiddenError('不允许访问此路径')
  }

  try {
    const stat = fs.statSync(targetDir)
    if (!stat.isDirectory()) {
      return res.status(400).json({ message: '不是文件夹' })
    }

    const entries = fs.readdirSync(targetDir, { withFileTypes: true })
    const children = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        path: path.join(targetDir, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

    const parent = path.dirname(targetDir)
    const effectiveParent = parent !== targetDir
      ? parent
      : (isWindowsDriveRoot(targetDir) || targetDir === '/' ? '' : null)

    res.json({
      current: targetDir,
      parent: effectiveParent,
      children,
    })
  } catch (e: any) {
    res.status(400).json({ message: e.message })
  }
})

// Scan folder
const scanSchema = z.object({
  path: z.string().min(1, '缺少文件夹路径'),
})

router.post('/scan', validate(scanSchema, 'body'), asyncHandler(async (req, res) => {
  const { path: folderPath } = req.body
  if (!isPathAllowed(folderPath)) throw new ForbiddenError('不允许访问此路径')

  const result = await scanFolder(folderPath)
  res.json({
    total: result.total,
    paired: result.paired,
    orphanJpg: result.orphanJpg,
    orphanRaw: result.orphanRaw,
  })
}))

// Get subfolders
const subfolderSchema = z.object({
  folder: z.string().min(1, '缺少 folder 参数'),
})

router.get('/subfolders', validate(subfolderSchema), (req, res) => {
  res.json(getSubfolders(req.query.folder as string))
})

export default router
