import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const dir = join(process.cwd(), 'e2e/fixtures/visual-photos')

// Minimal 1x1 pixel JPEG
const jpegData = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYI4Q/SFhSMMZRFABhSMSCYiIyRiwWKxwwNS0tf/2gAMAwEAAhEDEQA/APf6KKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//2Q==',
  'base64'
)

mkdirSync(dir, { recursive: true })

// Paired: JPG + RAW with same base name
const paired = [
  { name: 'photo-paired.jpg', data: jpegData },
  { name: 'photo-paired.nef', data: Buffer.from('minimal-raw') },
  { name: 'photo-paired2.jpg', data: jpegData },
  { name: 'photo-paired2.cr2', data: Buffer.from('minimal-raw') },
]

// Orphan JPG (no matching RAW)
const orphanJpg = { name: 'orphan-jpg.jpg', data: jpegData }

// Orphan RAW (no matching JPG)
const orphanRaw = { name: 'orphan-raw.cr2', data: Buffer.from('minimal-raw') }

const files = [...paired, orphanJpg, orphanRaw]
for (const file of files) {
  writeFileSync(join(dir, file.name), file.data)
  console.log(`Created: ${join(dir, file.name)}`)
}

// Create a paired-only directory for "no orphans" tests
const pairedDir = join(process.cwd(), 'e2e/fixtures/paired-photos')
mkdirSync(pairedDir, { recursive: true })
for (const file of paired) {
  writeFileSync(join(pairedDir, file.name), file.data)
  console.log(`Created: ${join(pairedDir, file.name)}`)
}
