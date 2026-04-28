import { APIRequestContext } from '@playwright/test'
import path from 'path'

export const TEST_PHOTOS_DIR = path.resolve(process.cwd(), 'e2e/fixtures/test-photos')

export async function scanTestFolder(request: APIRequestContext) {
  const resp = await request.post('/api/folders/scan', {
    data: { path: TEST_PHOTOS_DIR },
  })
  return resp.json()
}
