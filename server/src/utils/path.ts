import path from 'path'

export function normalizePath(p: string): string {
  return p.replaceAll('\\', '/')
}

export function resolveNormalized(p: string): string {
  return normalizePath(path.resolve(p))
}
