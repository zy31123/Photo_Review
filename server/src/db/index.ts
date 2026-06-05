import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { migrations } from './migrations.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'photo-review.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    runMigrations(db)
  }
  return db
}

function runMigrations(db: Database.Database): void {
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY)')
  const { v } = db.prepare('SELECT COALESCE(MAX(version), 0) as v FROM _migrations').get() as { v: number }

  for (const m of migrations) {
    if (m.version > v) {
      db.exec(m.up)
      db.prepare('INSERT INTO _migrations (version) VALUES (?)').run(m.version)
    }
  }

  // Seed default settings if not present
  const row = db.prepare("SELECT value FROM settings WHERE key = 'random_cache_days'").get() as { value: string } | undefined
  if (!row) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('random_cache_days', '7')").run()
  }
}
