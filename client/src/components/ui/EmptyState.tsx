import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      {Icon && <Icon className="size-14 text-text-muted" strokeWidth={1} />}
      <h3 className="text-lg font-semibold text-text-heading">{title}</h3>
      {description && <p className="text-sm text-text-secondary">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 rounded-lg border border-border-light text-text-secondary hover:text-text hover:bg-fill-muted transition-colors text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
