import { resolveNormalized } from './path.js'

const BLOCKED_PREFIXES = [
  '/etc', '/usr', '/bin', '/sbin', '/var', '/System', '/Library',
  '/private/etc', '/private/var', '/dev', '/proc', '/sys',
  'C:/Windows', 'C:/Program Files', 'C:/Program Files (x86)', 'C:/ProgramData',
]

export function isPathAllowed(p: string): boolean {
  const resolved = resolveNormalized(p).toLowerCase()
  return !BLOCKED_PREFIXES.some(prefix => resolved === prefix.toLowerCase() || resolved.startsWith(prefix.toLowerCase() + '/'))
}
