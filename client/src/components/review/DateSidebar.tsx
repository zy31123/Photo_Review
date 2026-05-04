import { useState, useCallback, memo } from 'react'
import { Calendar, ChevronRight } from 'lucide-react'
import { useReview } from '../../context/ReviewContext'
import type { MonthGroup } from '../../hooks/useDateGroups'

export default function DateSidebar() {
  const { monthGroups, selectedDate, setDateFilter, leftSidebarOpen, photos, currentPhoto, subfolderFilter, setSubfolderFilter, subfolders } = useReview()
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

  const toggleMonth = useCallback((ym: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev)
      next.has(ym) ? next.delete(ym) : next.add(ym)
      return next
    })
  }, [])

  const currentPhotoDate = currentPhoto?.date || null

  if (!leftSidebarOpen) {
    return (
      <div className="h-full bg-bg-deep border-r border-border/30 flex flex-col items-center pt-3">
        <Calendar className="w-5 h-5 text-text-muted" />
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-deep border-r border-border/30 flex flex-col overflow-hidden">
      <div className="px-4 pt-5 pb-3">
        {subfolders.length > 1 ? (
          <div className="space-y-0.5 mb-2">
            <button
              onClick={() => setSubfolderFilter(null)}
              className={`w-full text-left px-4 py-2.5 rounded-r text-sm font-semibold transition-all duration-200 ${
                subfolderFilter === null
                  ? 'text-accent border-l-2 border-accent bg-accent-subtle'
                  : 'text-text-secondary hover:text-text hover:bg-bg-raised'
              }`}
            >
              全部照片
              <span className="ml-2 text-text-muted">{photos.length}</span>
            </button>
            {subfolders.map(sf => (
              <button
                key={sf.path}
                onClick={() => setSubfolderFilter(sf.path === subfolderFilter ? null : sf.path)}
                className={`w-full text-left px-4 py-2.5 rounded-r text-sm transition-all duration-200 flex items-center justify-between ${
                  subfolderFilter === sf.path
                    ? 'text-accent border-l-2 border-accent bg-accent-subtle'
                    : 'text-text-secondary hover:text-text hover:bg-bg-raised'
                }`}
              >
                <span className="truncate">{sf.name}</span>
                <span className="text-text-muted text-xs shrink-0 ml-2">{sf.count}</span>
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setDateFilter(null)}
            className={`w-full text-left px-4 py-3 rounded-r text-xl font-semibold transition-all duration-200 ${
              selectedDate === null
                ? 'text-accent border-l-2 border-accent bg-accent-subtle'
                : 'text-text-secondary hover:text-text hover:bg-bg-raised'
            }`}
          >
            全部照片
            <span className="ml-2 text-sm text-text-muted">{photos.length}</span>
          </button>
        )}
      </div>
      <div className="border-b border-border/20 my-2" />

      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
        {monthGroups.map(month => (
          <MonthBlock
            key={month.yearMonth}
            month={month}
            collapsed={collapsedMonths.has(month.yearMonth)}
            onToggleMonth={toggleMonth}
            selectedDate={selectedDate}
            currentPhotoDate={currentPhotoDate}
            onSelectDate={setDateFilter}
          />
        ))}
      </div>
    </div>
  )
}

const MonthBlock = memo(function MonthBlock({
  month, collapsed, onToggleMonth, selectedDate, currentPhotoDate, onSelectDate,
}: {
  month: MonthGroup
  collapsed: boolean
  onToggleMonth: (ym: string) => void
  selectedDate: string | null
  currentPhotoDate: string | null
  onSelectDate: (date: string | null) => void
}) {
  return (
    <div>
      <button
        onClick={() => onToggleMonth(month.yearMonth)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold tracking-widest uppercase text-text-muted hover:text-text-secondary transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`} />
          {month.label}
        </span>
        <span className="text-text-muted font-normal text-sm">{month.count}</span>
      </button>

      {!collapsed && (
        <div className="space-y-0.5 ml-1">
          {month.dates.map(dg => (
            <DateRow
              key={dg.date}
              date={dg.date}
              label={dg.label}
              count={dg.count}
              reviewedCount={dg.reviewedCount}
              active={selectedDate === dg.date}
              isCurrent={currentPhotoDate === dg.date}
              onSelect={onSelectDate}
            />
          ))}
        </div>
      )}
    </div>
  )
})

const DateRow = memo(function DateRow({
  date, label, count, reviewedCount, active, isCurrent, onSelect,
}: {
  date: string
  label: string
  count: number
  reviewedCount: number
  active: boolean
  isCurrent: boolean
  onSelect: (d: string | null) => void
}) {
  const fullyReviewed = reviewedCount >= count
  const rowClass = active
    ? 'border-l-2 border-accent bg-accent-subtle text-accent'
    : isCurrent
      ? 'border-l-2 border-accent/40 text-text-secondary'
      : fullyReviewed
        ? 'text-text-muted hover:text-text-secondary'
        : 'text-text-secondary hover:text-text'

  const countColor = active ? 'text-accent/70' : fullyReviewed ? 'text-green-500/70' : 'text-text-muted'

  return (
    <button
      onClick={() => onSelect(active ? null : date)}
      className={`date-item w-full flex items-center justify-between pl-5 pr-3 py-2.5 text-sm rounded-r transition-all duration-200 ${rowClass}`}
    >
      <span className="relative z-10">{label}</span>
      <span className={`relative z-10 text-xs tabular-nums ${countColor}`}>
        {reviewedCount > 0 ? `${reviewedCount}/${count}` : count}
      </span>
    </button>
  )
})
