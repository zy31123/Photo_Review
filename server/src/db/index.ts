import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'photo-review.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema(db)
  }
  return db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS review_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT UNIQUE NOT NULL,
      file_name TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('keep', 'deleted')),
      review_mode TEXT NOT NULL CHECK(review_mode IN ('sequential', 'random')),
      reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      cache_until DATETIME
    );

    CREATE INDEX IF NOT EXISTS idx_review_records_cache ON review_records(cache_until);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  const row = db.prepare("SELECT value FROM settings WHERE key = 'random_cache_days'").get() as { value: string } | undefined
  if (!row) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('random_cache_days', '7')").run()
  }
}
