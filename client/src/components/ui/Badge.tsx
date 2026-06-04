type BadgeVariant = 'success' | 'danger' | 'neutral' | 'info'
type BadgeSize = 'sm' | 'md'

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'border-success/30 bg-success/5 text-success-dim',
  danger: 'border-danger/30 bg-danger/5 text-danger-dim',
  neutral: 'border-border-faint bg-fill-subtle text-text-secondary',
  info: 'border-accent/30 bg-accent/5 text-accent-dim',
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[0.6875rem]',
  md: 'px-2.5 py-1 text-xs',
}

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  children: React.ReactNode
}

export default function Badge({ variant = 'neutral', size = 'sm', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border font-medium ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}`}>
      {children}
    </span>
  )
}
