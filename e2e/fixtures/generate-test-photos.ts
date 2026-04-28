import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const dir = join(process.cwd(), 'e2e/fixtures/test-photos')

// Minimal 1x1 pixel JPEG (base64 encoded)
const jpegData = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYI4Q/SFhSMMZRFABhSMSCYiIyRiwWKxwwNS0tf/2gAMAwEAAhEDEQA/APf6KKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//2Q==',
  'base64'
)

mkdirSync(dir, { recursive: true })

const files = ['photo-red.jpg', 'photo-green.jpg', 'photo-blue.jpg']
for (const file of files) {
  writeFileSync(join(dir, file), jpegData)
  console.log(`Created: ${join(dir, file)}`)
}
