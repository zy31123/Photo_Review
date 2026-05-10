import { memo } from 'react'
import { useReview } from '../../context/ReviewContext'
import { DateSidebarBase, type DateRowCommonProps } from '../shared/DateSidebarBase'
import { useCollapsedMonths } from '../shared/useCollapsedMonths'

function getRowClass(active: boolean, isCurrent: boolean, fullyReviewed: boolean): string {
  if (active) return 'border-l-[3px] border-accent bg-accent-subtle text-accent font-semibold'
  if (isCurrent) return 'border-l-[3px] border-accent/40 text-text-secondary'
  if (fullyReviewed) return 'text-text-muted hover:text-text-secondary'
  return 'text-text hover:text-text-heading'
}

function getCountColor(active: boolean, fullyReviewed: boolean): string {
  if (active) return 'text-accent/70'
  if (fullyReviewed) return 'text-accent/50'
  return 'text-text-muted'
}

export default function DateSidebar() {
  const { monthGroups, selectedDate, setDateFilter, leftSidebarOpen, photos, currentPhoto, subfolderFilter, setSubfolderFilter, subfolders } = useReview()
  const { collapsedMonths, toggleMonth } = useCollapsedMonths()
  const currentPhotoDate = currentPhoto?.date || null

  return (
    <DateSidebarBase
      collapsed={!leftSidebarOpen}
      monthHeaderPadding="px-3 py-2.5"
      allPhotosPadding="px-4 py-3"
      monthListClassName="flex-1 overflow-y-auto px-3 pb-6 space-y-1"
      monthGroups={monthGroups}
      selectedDate={selectedDate}
      photoCount={photos.length}
      subfolders={subfolders}
      subfolderFilter={subfolderFilter}
      onSelectDate={setDateFilter}
      onSetSubfolderFilter={setSubfolderFilter}
      onClearSelection={() => setDateFilter(null)}
      collapsedMonths={collapsedMonths}
      onToggleMonth={toggleMonth}
      DateRowComponent={ReviewDateRow}
      buildDateRowProps={(dg) => ({ isCurrent: currentPhotoDate === dg.date })}
    />
  )
}

const ReviewDateRow = memo(function ReviewDateRow({
  date, label, count, reviewedCount, active, onSelect, isCurrent = false,
}: DateRowCommonProps) {
  const fullyReviewed = reviewedCount >= count
  const rowClass = getRowClass(active, isCurrent, fullyReviewed)
  const countColor = getCountColor(active, fullyReviewed)

  return (
    <button
      onClick={() => onSelect(active ? null : date)}
      className={`date-item w-full flex items-center justify-between pl-5 pr-3 py-3 text-sm rounded-r transition-all duration-200 ${rowClass}`}
    >
      <span className="relative z-10">{label}</span>
      <span className={`relative z-10 text-xs tabular-nums ${countColor}`}>
        {reviewedCount > 0 ? `${reviewedCount}/${count}` : count}
      </span>
    </button>
  )
})
