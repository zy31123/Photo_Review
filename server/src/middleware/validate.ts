import { type Request, type Response, type NextFunction } from 'express'
import { type ZodSchema } from 'zod'
import { ValidationError } from './errorHandler.js'

export function validate(schema: ZodSchema, source: 'query' | 'body' | 'params' = 'query') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      throw new ValidationError(result.error.issues.map(i => i.message).join('; '))
    }
    // Express 5 makes req.query read-only; for body/params we can assign
    if (source !== 'query') {
      req[source] = result.data
    }
    next()
  }
}
