export const migrations = [
  {
    version: 1,
    up: `
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

      CREATE TABLE IF NOT EXISTS photo_hashes (
        file_path TEXT PRIMARY KEY,
        dhash TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        computed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
]
