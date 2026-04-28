import { useMemo } from 'react'
import type { PhotoGroup } from '../api'
import { formatChineseDate } from '../utils/date'

export interface DateGroup {
  date: string
  label: string
  count: number
  startIndex: number
  photos: PhotoGroup[]
}

export interface MonthGroup {
  yearMonth: string
  label: string
  count: number
  dates: DateGroup[]
}

export function useDateGroups(photos: PhotoGroup[], selectedDate: string | null) {
  const monthGroups = useMemo(() => {
    const groups: MonthGroup[] = []
    let currentMonth: MonthGroup | null = null

    for (const photo of photos) {
      const date = photo.date || '未知日期'
      const yearMonth = date.length >= 7 ? date.slice(0, 7) : '未知'

      if (!currentMonth || currentMonth.yearMonth !== yearMonth) {
        const parts = yearMonth.split('-')
        const y: string = parts[0]
        const m: string = parts[1]
        currentMonth = { yearMonth, label: y && m ? `${y}年${parseInt(m)}月` : yearMonth, count: 0, dates: [] }
        groups.push(currentMonth)
      }

      const lastDate = currentMonth.dates[currentMonth.dates.length - 1]
      if (!lastDate || lastDate.date !== date) {
        currentMonth.dates.push({
          date,
          label: formatChineseDate(date),
          count: 1,
          startIndex: currentMonth.count,
          photos: [photo],
        })
      } else {
        lastDate.count++
        lastDate.photos.push(photo)
      }
      currentMonth.count++
    }
    return groups
  }, [photos])

  const filteredPhotos = useMemo(() => {
    if (!selectedDate) return photos
    for (const month of monthGroups) {
      for (const dg of month.dates) {
        if (dg.date === selectedDate) return dg.photos
      }
    }
    return photos
  }, [photos, selectedDate, monthGroups])

  const dateOfIndex = useMemo(() => {
    const map = new Map<number, string>()
    photos.forEach((p, i) => map.set(i, p.date || ''))
    return map
  }, [photos])

  return { monthGroups, filteredPhotos, dateOfIndex }
}
