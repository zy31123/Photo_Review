interface SegmentedControlOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export default function SegmentedControl<T extends string>({
  options, value, onChange, className = '',
}: SegmentedControlProps<T>) {
  return (
    <div className={`flex items-center bg-fill-muted rounded-lg p-0.5 ${className}`}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
            value === opt.value
              ? 'bg-white text-text-heading shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
