type BadgeVariant = 'success' | 'danger' | 'neutral' | 'info'

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'border-success/30 bg-success-subtle text-success-dim',
  danger: 'border-danger/30 bg-danger-subtle text-danger-dim',
  neutral: 'border-border-subtle bg-fill-subtle text-text-secondary',
  info: 'border-accent/30 bg-accent-subtle text-accent-hover',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
}

export default function Badge({ variant = 'neutral', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-micro font-medium ${VARIANT_CLASSES[variant]}`}>
      {children}
    </span>
  )
}
