/**
 * Centralized configuration.
 * All magic numbers and environment-dependent values live here.
 * Override via environment variables or .env file.
 */

function envInt(key: string, fallback: number): number {
  const v = process.env[key]
  return v ? Number(v) : fallback
}

function envStr(key: string, fallback: string): string {
  return process.env[key] || fallback
}

// Server
export const PORT = envInt('PORT', 3001)
export const CORS_ORIGINS = envStr('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

// Thumbnails
export const THUMBNAIL_SIZE = envInt('THUMBNAIL_SIZE', 400)
export const MAX_MEMORY_CACHE = envInt('MAX_MEMORY_CACHE', 500)
export const MAX_DISK_CACHE_MB = envInt('MAX_DISK_CACHE_MB', 500)

// Storage
export const MAX_FOLDERS = envInt('MAX_FOLDERS', 10)

// Query
export const DEFAULT_PAGE_LIMIT = envInt('DEFAULT_PAGE_LIMIT', 5000)

// SQLite — SQLITE_MAX_VARIABLE_NUMBER 安全上限
export const SQLITE_IN_CHUNK = 900
