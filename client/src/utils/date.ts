export function formatChineseDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`
}
