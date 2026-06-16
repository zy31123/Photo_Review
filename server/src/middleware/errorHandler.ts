import { type Request, type Response, type NextFunction } from 'express'

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(404, message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '不允许访问') {
    super(403, message)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message)
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: String(err.statusCode), message: err.message } })
  } else {
    console.error('[server] 未处理错误:', err)
    res.status(500).json({ error: { code: '500', message: '服务器内部错误' } })
  }
}
