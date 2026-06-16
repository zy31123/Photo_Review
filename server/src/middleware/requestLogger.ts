import type { Request, Response, NextFunction } from 'express'
import crypto from 'node:crypto'

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint()
  const requestId = req.headers['x-request-id'] as string | undefined ?? crypto.randomUUID()

  // Attach request ID to response headers
  res.setHeader('x-request-id', requestId)

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e6
    const { method, originalUrl } = req
    const { statusCode } = res
    console.log(`[${requestId.slice(0, 8)}] ${method} ${originalUrl} ${statusCode} ${duration.toFixed(1)}ms`)
  })

  next()
}
