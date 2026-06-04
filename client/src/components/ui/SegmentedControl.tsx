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
    <div className={`flex items-center bg-fill-subtle rounded-sm p-0.5 ${className}`}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 rounded-sm text-caption font-medium transition-colors duration-fast ${
            value === opt.value
              ? 'bg-bg-elevated text-text shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
