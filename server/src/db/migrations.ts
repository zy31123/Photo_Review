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
  {
    version: 2,
    up: `ALTER TABLE photo_hashes ADD COLUMN color_hist TEXT;`,
  },
  {
    version: 3,
    up: `
      CREATE TABLE IF NOT EXISTS photo_meta (
        photo_path TEXT PRIMARY KEY,
        rating INTEGER DEFAULT 0,
        favorite INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS photo_tags (
        photo_path TEXT NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (photo_path, tag_id),
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('manual','smart')),
        smart_rules TEXT,
        cover_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS collection_photos (
        collection_id INTEGER NOT NULL,
        photo_path TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        PRIMARY KEY (collection_id, photo_path),
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS photo_exif_index (
        photo_path TEXT PRIMARY KEY,
        camera TEXT,
        lens TEXT,
        focal REAL,
        aperture REAL,
        shutter REAL,
        iso INTEGER,
        date_taken TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_exif_camera ON photo_exif_index(camera);
      CREATE INDEX IF NOT EXISTS idx_exif_lens ON photo_exif_index(lens);
      CREATE INDEX IF NOT EXISTS idx_exif_date ON photo_exif_index(date_taken);
    `,
  },
]
