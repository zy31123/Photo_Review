import path from 'path'

export const TEST_PHOTOS_DIR = path.resolve(process.cwd(), 'e2e/fixtures/test-photos')

export const MOCK_PHOTOS = [
  { id: 'mock-red', name: 'photo-red.jpg', jpgPath: 'photo-red.jpg', rawPaths: [], hasJpg: true, hasRaw: false, isOrphan: false, folder: TEST_PHOTOS_DIR },
  { id: 'mock-green', name: 'photo-green.jpg', jpgPath: 'photo-green.jpg', rawPaths: [], hasJpg: true, hasRaw: false, isOrphan: false, folder: TEST_PHOTOS_DIR },
  { id: 'mock-blue', name: 'photo-blue.jpg', jpgPath: 'photo-blue.jpg', rawPaths: [], hasJpg: true, hasRaw: false, isOrphan: false, folder: TEST_PHOTOS_DIR },
]
