import { useState, useCallback, memo } from 'react'
import { useReview } from '../../context/ReviewContext'
import type { MonthGroup } from '../../hooks/useDateGroups'

export default function DateSidebar() {
  const { monthGroups, selectedDate, setDateFilter, leftSidebarOpen, photos, currentPhoto } = useReview()
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
        <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
          <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" />
          <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" />
          <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
        </svg>
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-deep border-r border-border/30 flex flex-col overflow-hidden" style={{ paddingLeft: 12 }}>
      <div className="px-5 pt-4 pb-2">
        <button
          onClick={() => setDateFilter(null)}
          className={`w-full text-left px-4 py-3 rounded-r text-lg transition-all duration-200 ${
            selectedDate === null
              ? 'text-accent border-l-2 border-accent bg-accent-subtle'
              : 'text-text-secondary hover:text-text hover:bg-bg-raised'
          }`}
        >
          全部照片
          <span className="ml-2 text-sm text-text-muted">{photos.length}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
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
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold tracking-[0.08em] uppercase text-text-muted hover:text-text-secondary transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`}
            fill="currentColor" viewBox="0 0 20 20"
          >
            <path d="M6 4l8 6-8 6V4z" />
          </svg>
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
      className={`date-item w-full flex items-center justify-between pl-5 pr-3 py-3 text-base rounded-r transition-all duration-200 ${rowClass}`}
    >
      <span className="relative z-10">{label}</span>
      <span className={`relative z-10 text-sm tabular-nums ${countColor}`}>
        {reviewedCount > 0 ? `${reviewedCount}/${count}` : count}
      </span>
    </button>
  )
})
