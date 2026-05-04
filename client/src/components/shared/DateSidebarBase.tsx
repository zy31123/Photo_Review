import { memo, type ComponentType } from 'react'
import { Calendar, ChevronRight } from 'lucide-react'
import type { MonthGroup, DateGroup } from '../../hooks/useDateGroups'
import type { SubfolderInfo } from '../../api'

export interface DateRowCommonProps {
  date: string
  label: string
  count: number
  reviewedCount: number
  active: boolean
  isCurrent?: boolean
  onSelect: (date: string | null) => void
}

interface DateSidebarBaseProps {
  collapsed: boolean
  collapsedClassName?: string
  expandedClassName?: string
  expandedStyle?: React.CSSProperties
  monthHeaderPadding?: string
  allPhotosPadding?: string
  monthListClassName?: string

  monthGroups: MonthGroup[]
  selectedDate: string | null
  photoCount: number
  subfolders: SubfolderInfo[]
  subfolderFilter: string | null

  onSelectDate: (date: string | null) => void
  onSetSubfolderFilter: (filter: string | null) => void
  onClearSelection: () => void

  collapsedMonths: Set<string>
  onToggleMonth: (ym: string) => void

  DateRowComponent?: ComponentType<DateRowCommonProps>
  buildDateRowProps?: (dg: DateGroup) => Record<string, unknown>
}

export function DateSidebarBase({
  collapsed,
  collapsedClassName,
  expandedClassName,
  expandedStyle,
  monthHeaderPadding = 'px-4 py-3',
  allPhotosPadding = 'px-5 py-4',
  monthListClassName = 'flex-1 overflow-y-auto px-3 pb-6 space-y-1.5',
  monthGroups,
  selectedDate,
  photoCount,
  subfolders,
  subfolderFilter,
  onSelectDate,
  onSetSubfolderFilter,
  onClearSelection,
  collapsedMonths,
  onToggleMonth,
  DateRowComponent = SimpleDateRow,
  buildDateRowProps,
}: DateSidebarBaseProps) {
  if (collapsed) {
    return (
      <div className={`h-full bg-bg-deep border-r border-border/30 flex flex-col items-center pt-3 ${collapsedClassName ?? ''}`}>
        <Calendar className="w-5 h-5 text-text-muted" />
      </div>
    )
  }

  return (
    <div className={`h-full bg-bg-deep border-r border-border/30 flex flex-col overflow-hidden ${expandedClassName ?? ''}`} style={expandedStyle}>
      <div className="px-4 pt-5 pb-3">
        {subfolders.length > 1 ? (
          <div className="space-y-0.5 mb-2">
            <button
              onClick={() => onSetSubfolderFilter(null)}
              className={`w-full text-left px-4 py-2.5 rounded-r text-sm font-semibold transition-all duration-200 ${
                subfolderFilter === null
                  ? 'text-accent border-l-2 border-accent bg-accent-subtle'
                  : 'text-text-secondary hover:text-text hover:bg-bg-raised'
              }`}
            >
              全部照片
              <span className="ml-2 text-text-muted">{photoCount}</span>
            </button>
            {subfolders.map(sf => (
              <button
                key={sf.path}
                onClick={() => onSetSubfolderFilter(sf.path === subfolderFilter ? null : sf.path)}
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
            onClick={onClearSelection}
            className={`w-full text-left ${allPhotosPadding} rounded-r text-xl font-semibold transition-all duration-200 ${
              selectedDate === null
                ? 'text-accent border-l-2 border-accent bg-accent-subtle'
                : 'text-text-secondary hover:text-text hover:bg-bg-raised'
            }`}
          >
            全部照片
            <span className="ml-2 text-sm text-text-muted">{photoCount}</span>
          </button>
        )}
      </div>
      <div className="border-b border-border/20 my-2" />

      <div className={monthListClassName}>
        {monthGroups.map(month => (
          <SidebarMonthBlock
            key={month.yearMonth}
            month={month}
            collapsed={collapsedMonths.has(month.yearMonth)}
            onToggleMonth={onToggleMonth}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            monthHeaderPadding={monthHeaderPadding}
            DateRowComponent={DateRowComponent}
            buildDateRowProps={buildDateRowProps}
          />
        ))}
      </div>
    </div>
  )
}

function SidebarMonthBlock({
  month, collapsed, onToggleMonth, selectedDate, onSelectDate,
  monthHeaderPadding, DateRowComponent, buildDateRowProps,
}: {
  month: MonthGroup
  collapsed: boolean
  onToggleMonth: (ym: string) => void
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
  monthHeaderPadding: string
  DateRowComponent: ComponentType<DateRowCommonProps>
  buildDateRowProps?: (dg: DateGroup) => Record<string, unknown>
}) {
  return (
    <div>
      <button
        onClick={() => onToggleMonth(month.yearMonth)}
        className={`w-full flex items-center justify-between ${monthHeaderPadding} text-xs font-semibold tracking-widest uppercase text-text-muted hover:text-text-secondary transition-colors`}
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
            <DateRowComponent
              key={dg.date}
              date={dg.date}
              label={dg.label}
              count={dg.count}
              reviewedCount={dg.reviewedCount}
              active={selectedDate === dg.date}
              onSelect={onSelectDate}
              {...(buildDateRowProps?.(dg) ?? {})}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const SimpleDateRow = memo(function SimpleDateRow({
  date, label, count, active, onSelect,
}: DateRowCommonProps) {
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
