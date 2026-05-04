import { useState, useCallback } from 'react'

export function useCollapsedMonths() {
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

  const toggleMonth = useCallback((ym: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev)
      next.has(ym) ? next.delete(ym) : next.add(ym)
      return next
    })
  }, [])

  return { collapsedMonths, toggleMonth }
}
