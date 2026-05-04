import { useCallback } from 'react'
import { useGrid } from '../../context/GridContext'
import { DateSidebarBase } from '../shared/DateSidebarBase'
import { useCollapsedMonths } from '../shared/useCollapsedMonths'

export default function GridDateSidebar() {
  const {
    monthGroups, selectedDate, setSelectedDate, sidebarOpen,
    photos, subfolderFilter, setSubfolderFilter, subfolders, scrollToRef,
  } = useGrid()

  const { collapsedMonths, toggleMonth } = useCollapsedMonths()

  const handleDateClick = useCallback((date: string | null) => {
    if (date === null || selectedDate === date) {
      setSelectedDate(null)
    } else {
      setSelectedDate(date)
      scrollToRef.current(date)
    }
  }, [selectedDate, setSelectedDate, scrollToRef])

  return (
    <DateSidebarBase
      collapsed={!sidebarOpen}
      collapsedClassName="w-14 shrink-0"
      expandedClassName="shrink-0"
      expandedStyle={{ width: 'clamp(260px, 15vw, 380px)' }}
      monthGroups={monthGroups}
      selectedDate={selectedDate}
      photoCount={photos.length}
      subfolders={subfolders}
      subfolderFilter={subfolderFilter}
      onSelectDate={handleDateClick}
      onSetSubfolderFilter={setSubfolderFilter}
      onClearSelection={() => setSelectedDate(null)}
      collapsedMonths={collapsedMonths}
      onToggleMonth={toggleMonth}
    />
  )
}
