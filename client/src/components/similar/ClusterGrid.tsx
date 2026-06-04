import { useSimilar } from '../../context/SimilarContext'
import ClusterCard from './ClusterCard'

export default function ClusterGrid() {
  const { groups } = useSimilar()

  if (groups.length === 0) return null

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {groups.map(group => (
          <ClusterCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  )
}
