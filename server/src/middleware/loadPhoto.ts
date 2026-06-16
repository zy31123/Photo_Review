import { type Request, type Response, type NextFunction } from 'express'
import type { PhotoGroup } from '@photo-review/shared'
import { getPhotoById } from '../services/photoStore.js'
import { NotFoundError } from './errorHandler.js'

declare global {
  namespace Express {
    interface Request {
      photo?: PhotoGroup
    }
  }
}

export function loadPhoto(req: Request, _res: Response, next: NextFunction): void {
  const photo = getPhotoById(req.params.id as string)
  if (!photo) throw new NotFoundError('照片不存在')
  req.photo = photo
  next()
}
