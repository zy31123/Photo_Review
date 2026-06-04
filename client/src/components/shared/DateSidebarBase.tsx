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
  monthHeaderPadding = 'px-3 py-2',
  allPhotosPadding = 'px-4 py-3',
  monthListClassName = 'flex-1 overflow-y-auto px-3 pb-6 space-y-0.5',
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
      <div className={`h-full bg-glass-thin backdrop-blur-xl border-r border-border-subtle flex flex-col items-center pt-3 ${collapsedClassName ?? ''}`}>
        <Calendar className="w-5 h-5 text-text-tertiary" />
      </div>
    )
  }

  return (
    <div className={`h-full bg-glass-thin backdrop-blur-xl border-r border-border-subtle flex flex-col overflow-hidden ${expandedClassName ?? ''}`} style={expandedStyle}>
      <div className="px-4 pt-4 pb-3">
        {subfolders.length > 1 ? (
          <div className="space-y-0.5 mb-2">
            <button
              onClick={() => onSetSubfolderFilter(null)}
              className={`w-full text-left px-4 py-2 rounded-r text-caption font-semibold transition-colors duration-fast ${
                subfolderFilter === null
                  ? 'text-accent border-l-2 border-accent bg-accent-subtle'
                  : 'text-text-secondary hover:text-text hover:bg-fill-subtle'
              }`}
            >
              全部照片
              <span className="ml-2 text-text-tertiary text-micro">{photoCount}</span>
            </button>
            {subfolders.map(sf => (
              <button
                key={sf.path}
                onClick={() => onSetSubfolderFilter(sf.path === subfolderFilter ? null : sf.path)}
                className={`w-full text-left px-4 py-2 rounded-r text-caption transition-colors duration-fast flex items-center justify-between ${
                  subfolderFilter === sf.path
                    ? 'text-accent border-l-2 border-accent bg-accent-subtle font-semibold'
                    : 'text-text-secondary hover:text-text hover:bg-fill-subtle'
                }`}
              >
                <span className="truncate">{sf.name}</span>
                <span className="text-text-tertiary text-micro shrink-0 ml-2">{sf.count}</span>
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={onClearSelection}
            className={`w-full text-left ${allPhotosPadding} rounded-r text-title-2 font-semibold transition-colors duration-fast ${
              selectedDate === null
                ? 'text-accent border-l-2 border-accent bg-accent-subtle'
                : 'text-text-secondary hover:text-text hover:bg-fill-subtle'
            }`}
          >
            全部照片
            <span className="ml-2 text-caption text-text-tertiary">{photoCount}</span>
          </button>
        )}
      </div>
      <div className="border-b border-border-subtle mx-3" />

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
        className={`w-full flex items-center justify-between ${monthHeaderPadding} text-micro font-semibold text-text-tertiary hover:text-text-secondary transition-colors duration-fast`}
      >
        <span className="flex items-center gap-1.5">
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-fast ${collapsed ? '' : 'rotate-90'}`} />
          {month.label}
        </span>
        <span className="text-text-tertiary font-normal text-caption">{month.count}</span>
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
      className={`w-full flex items-center justify-between pl-5 pr-3 py-2.5 text-caption rounded-r transition-colors duration-fast ${
        active
          ? 'border-l-2 border-accent bg-accent-subtle text-accent font-semibold'
          : 'text-text hover:text-text hover:bg-fill-subtle'
      }`}
    >
      <span>{label}</span>
      <span className="text-text-tertiary text-micro tabular-nums">{count}</span>
    </button>
  )
})
