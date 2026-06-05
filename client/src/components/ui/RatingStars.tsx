import { Star } from 'lucide-react'

interface RatingStarsProps {
  rating: number
  onChange?: (rating: number) => void
  size?: number
  className?: string
}

export default function RatingStars({ rating, onChange, size = 16, className = '' }: RatingStarsProps) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= rating
        return (
          <button
            key={star}
            onClick={onChange ? () => onChange(star === rating ? 0 : star) : undefined}
            className={`transition-colors duration-fast ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
            title={onChange ? `${star} 星` : undefined}
            disabled={!onChange}
          >
            <Star
              size={size}
              strokeWidth={1.5}
              className={filled ? 'text-amber-400 fill-amber-400' : 'text-white/20'}
            />
          </button>
        )
      })}
    </div>
  )
}
