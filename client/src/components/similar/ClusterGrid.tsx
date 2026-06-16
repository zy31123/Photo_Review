import { useEffect, useRef } from 'react'
import { useSimilar } from '../../context/SimilarContext'
import ClusterCard from './ClusterCard'

export default function ClusterGrid() {
  const { groups, focusedIndex } = useSimilar()
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const el = cardRefs.current[focusedIndex]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [focusedIndex])

  if (groups.length === 0) return null

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {groups.map((group, idx) => (
          <div key={group.id} ref={el => { cardRefs.current[idx] = el }}>
            <ClusterCard group={group} focused={idx === focusedIndex} />
          </div>
        ))}
      </div>
    </div>
  )
}
