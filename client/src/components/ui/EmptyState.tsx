import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      {Icon && <Icon className="size-12 text-text-tertiary" strokeWidth={1} />}
      <h3 className="text-title-2 font-semibold text-text">{title}</h3>
      {description && <p className="text-caption text-text-secondary">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 px-5 py-2.5 rounded-md border border-border text-text-secondary hover:text-text hover:bg-fill-subtle transition-colors duration-fast text-caption font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
