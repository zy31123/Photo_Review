import { useMemo } from 'react'
import { useGrid } from '../../context/GridContext'

type Granularity = 'year' | 'month' | 'date'

interface TimelineItem {
  label: string
  date: string
  secondary?: string
}

function pickGranularity(dateSections: { date: string }[]): Granularity {
  if (dateSections.length < 2) return 'month'
  const dates = dateSections.map(s => s.date).filter(d => d && d.length >= 10).sort()
  if (dates.length < 2) return 'month'
  const first = new Date(dates[0])
  const last = new Date(dates[dates.length - 1])
  const spanDays = (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)
  if (spanDays > 365 * 2) return 'year'
  if (spanDays > 90) return 'month'
  return 'date'
}

function buildItems(
  granularity: Granularity,
  monthGroups: { yearMonth: string; label: string; dates: { date: string; label: string; count: number }[] }[],
): TimelineItem[] {
  const items: TimelineItem[] = []

  if (granularity === 'year') {
    const seen = new Set<string>()
    for (const mg of monthGroups) {
      const year = mg.yearMonth.slice(0, 4)
      if (!seen.has(year)) {
        seen.add(year)
        items.push({ label: year, date: mg.dates[0]?.date ?? '' })
      }
    }
  } else if (granularity === 'month') {
    for (const mg of monthGroups) {
      const m = mg.yearMonth.slice(5, 7)
      items.push({ label: `${parseInt(m)}月`, secondary: mg.yearMonth.slice(0, 4), date: mg.dates[0]?.date ?? '' })
    }
  } else {
    for (const mg of monthGroups) {
      for (const dg of mg.dates) {
        const day = dg.date.slice(8, 10)
        items.push({ label: `${parseInt(day)}日`, secondary: dg.date.slice(0, 7), date: dg.date })
      }
    }
  }

  return items
}

export default function YearTimeline() {
  const { monthGroups, dateSections, scrollToRef, selectedDate, setSelectedDate } = useGrid()

  const granularity = useMemo(() => pickGranularity(dateSections), [dateSections])

  const items = useMemo(() => buildItems(granularity, monthGroups), [granularity, monthGroups])

  const handleClick = (date: string) => {
    if (!date) return
    setSelectedDate(date)
    scrollToRef.current(date)
  }

  const groupBySecondary = useMemo(() => {
    if (granularity === 'year') return null
    const groups = new Map<string, TimelineItem[]>()
    for (const item of items) {
      const key = item.secondary ?? ''
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }
    return groups
  }, [items, granularity])

  const isItemActive = (item: TimelineItem) => {
    if (!selectedDate) return false
    if (granularity === 'year') return selectedDate.startsWith(item.date.slice(0, 4))
    if (granularity === 'month') return selectedDate.startsWith(item.date.slice(0, 7))
    return selectedDate === item.date
  }

  return (
    <div className="w-16 shrink-0 border-l border-border-light bg-surface-secondary backdrop-blur-xl overflow-y-auto py-4 flex flex-col items-center gap-2">
      {granularity === 'year' && items.map(item => (
        <button
          key={item.label}
          onClick={() => handleClick(item.date)}
          className={`text-sm font-medium leading-tight transition-colors cursor-pointer py-1.5 px-3 rounded ${
            isItemActive(item) ? 'text-accent font-semibold' : 'text-text-secondary hover:text-accent hover:bg-accent/5'
          }`}
        >
          {item.label}
        </button>
      ))}

      {granularity !== 'year' && groupBySecondary && Array.from(groupBySecondary.entries()).map(([header, subItems]) => (
        <div key={header} className="flex flex-col items-center gap-1 w-full">
          <div className="text-text-muted text-xs font-semibold leading-none py-1">
            {granularity === 'month' ? header : header.slice(5)}
          </div>
          {subItems.map(item => (
            <button
              key={`${item.label}-${item.date}`}
              onClick={() => handleClick(item.date)}
              className={`text-sm leading-tight transition-colors cursor-pointer py-1 px-2.5 rounded ${
                isItemActive(item) ? 'text-accent font-semibold' : 'text-text-secondary hover:text-accent hover:bg-accent/5'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="w-6 h-px bg-fill-medium" />
        </div>
      ))}
    </div>
  )
}
