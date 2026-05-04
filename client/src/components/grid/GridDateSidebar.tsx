import { useState, useCallback, memo } from 'react'
import { Calendar, ChevronRight } from 'lucide-react'
import { useGrid } from '../../context/GridContext'
import type { MonthGroup } from '../../hooks/useDateGroups'

export default function GridDateSidebar() {
  const {
    monthGroups, selectedDate, setSelectedDate, sidebarOpen,
    photos, subfolderFilter, setSubfolderFilter, subfolders, scrollToRef,
  } = useGrid()
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

  const toggleMonth = useCallback((ym: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev)
      next.has(ym) ? next.delete(ym) : next.add(ym)
      return next
    })
  }, [])

  const handleDateClick = useCallback((date: string) => {
    if (selectedDate === date) {
      setSelectedDate(null)
    } else {
      setSelectedDate(date)
      scrollToRef.current(date)
    }
  }, [selectedDate, setSelectedDate, scrollToRef])

  if (!sidebarOpen) {
    return (
      <div className="h-full bg-bg-deep border-r border-border/30 flex flex-col items-center pt-3 w-14 shrink-0">
        <Calendar className="w-5 h-5 text-text-muted" />
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-deep border-r border-border/30 flex flex-col overflow-hidden shrink-0" style={{ width: 'clamp(260px, 15vw, 380px)' }}>
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
            onClick={() => setSelectedDate(null)}
            className={`w-full text-left px-5 py-4 rounded-r text-xl font-semibold transition-all duration-200 ${
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

      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1.5">
        {monthGroups.map(month => (
          <SidebarMonthBlock
            key={month.yearMonth}
            month={month}
            collapsed={collapsedMonths.has(month.yearMonth)}
            onToggleMonth={toggleMonth}
            selectedDate={selectedDate}
            onSelectDate={handleDateClick}
          />
        ))}
      </div>
    </div>
  )
}

const SidebarMonthBlock = memo(function SidebarMonthBlock({
  month, collapsed, onToggleMonth, selectedDate, onSelectDate,
}: {
  month: MonthGroup
  collapsed: boolean
  onToggleMonth: (ym: string) => void
  selectedDate: string | null
  onSelectDate: (date: string) => void
}) {
  return (
    <div>
      <button
        onClick={() => onToggleMonth(month.yearMonth)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold tracking-widest uppercase text-text-muted hover:text-text-secondary transition-colors"
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
            <SidebarDateRow
              key={dg.date}
              date={dg.date}
              label={dg.label}
              count={dg.count}
              active={selectedDate === dg.date}
              onSelect={onSelectDate}
            />
          ))}
        </div>
      )}
    </div>
  )
})

const SidebarDateRow = memo(function SidebarDateRow({
  date, label, count, active, onSelect,
}: {
  date: string
  label: string
  count: number
  active: boolean
  onSelect: (d: string) => void
}) {
  return (
    <button
      onClick={() => onSelect(date)}
      className={`w-full flex items-center justify-between pl-5 pr-3 py-2.5 text-sm rounded-r transition-all duration-200 ${
        active
          ? 'border-l-2 border-accent bg-accent-subtle text-accent'
          : 'text-text-secondary hover:text-text hover:bg-bg-raised'
      }`}
    >
      <span>{label}</span>
      <span className="text-text-muted text-xs tabular-nums">{count}</span>
    </button>
  )
})
