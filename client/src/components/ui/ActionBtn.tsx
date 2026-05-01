const VARIANT_COLORS: Record<string, string> = {
  danger: 'hover:bg-danger/20 hover:text-danger',
  success: 'hover:bg-success/20 hover:text-success',
}

export default function ActionBtn({
  onClick, disabled, variant, label, shortcut, children,
}: {
  onClick: () => void
  disabled?: boolean
  variant?: 'danger' | 'success'
  label: string
  shortcut: string
  children: React.ReactNode
}) {
  const colors = variant ? VARIANT_COLORS[variant] : 'hover:bg-white/10 hover:text-text'

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-16 h-16 rounded-full flex items-center justify-center text-text-secondary transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent/50 ${colors}`}
        title={`${label} (${shortcut})`}
      >
        {children}
      </button>
      <span className="text-sm text-text-muted tabular-nums">{label} ({shortcut})</span>
    </div>
  )
}
