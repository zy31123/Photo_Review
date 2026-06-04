import { useMemo } from 'react'
import type { PhotoGroup } from '../api'
import { formatChineseDate } from '../utils/date'

export type StatusFilter = 'all' | 'unreviewed' | 'reviewed'

function applyStatusFilter(photos: PhotoGroup[], filter: StatusFilter): PhotoGroup[] {
  if (filter === 'all') return photos
  if (filter === 'unreviewed') return photos.filter(p => !p.reviewAction)
  return photos.filter(p => !!p.reviewAction)
}

export interface DateGroup {
  date: string
  label: string
  count: number
  reviewedCount: number
  startIndex: number
  photos: PhotoGroup[]
}

export interface MonthGroup {
  yearMonth: string
  label: string
  count: number
  reviewedCount: number
  dates: DateGroup[]
}

export function useDateGroups(photos: PhotoGroup[], selectedDate: string | null, statusFilter: StatusFilter = 'all', subfolderFilter: string | null = null) {
  const monthGroups = useMemo(() => {
    const source = subfolderFilter
      ? photos.filter(p => p.subfolder === subfolderFilter)
      : photos
    const groups: MonthGroup[] = []
    let currentMonth: MonthGroup | null = null

    for (const photo of source) {
      const date = photo.date || '未知日期'
      const yearMonth = date.length >= 7 ? date.slice(0, 7) : '未知'
      const isReviewed = !!photo.reviewAction

      if (!currentMonth || currentMonth.yearMonth !== yearMonth) {
        const parts = yearMonth.split('-')
        const y: string = parts[0]
        const m: string = parts[1]
        currentMonth = { yearMonth, label: y && m ? `${y}年${parseInt(m)}月` : yearMonth, count: 0, reviewedCount: 0, dates: [] }
        groups.push(currentMonth)
      }

      const lastDate = currentMonth.dates[currentMonth.dates.length - 1]
      if (!lastDate || lastDate.date !== date) {
        currentMonth.dates.push({
          date,
          label: formatChineseDate(date),
          count: 1,
          reviewedCount: isReviewed ? 1 : 0,
          startIndex: currentMonth.count,
          photos: [photo],
        })
      } else {
        lastDate.count++
        if (isReviewed) lastDate.reviewedCount++
        lastDate.photos.push(photo)
      }
      currentMonth.count++
      if (isReviewed) currentMonth.reviewedCount++
    }
    return groups
  }, [photos, subfolderFilter])

  const filteredPhotos = useMemo(() => {
    const subfolderSource = subfolderFilter
      ? photos.filter(p => p.subfolder === subfolderFilter)
      : photos
    const source = selectedDate
      ? monthGroups.flatMap(m => m.dates).find(dg => dg.date === selectedDate)?.photos ?? subfolderSource
      : subfolderSource
    return applyStatusFilter(source, statusFilter)
  }, [photos, selectedDate, monthGroups, statusFilter, subfolderFilter])

  const dateOfIndex = useMemo(() => {
    const map = new Map<number, string>()
    photos.forEach((p, i) => map.set(i, p.date || ''))
    return map
  }, [photos])

  return { monthGroups, filteredPhotos, dateOfIndex }
}
