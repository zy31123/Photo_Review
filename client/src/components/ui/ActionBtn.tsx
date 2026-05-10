const VARIANT_COLORS: Record<string, string> = {
  danger: 'hover:bg-red-500/30 hover:text-red-300',
  success: 'hover:bg-green-500/30 hover:text-green-300',
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
  const colors = variant ? VARIANT_COLORS[variant] : 'hover:bg-white/15 hover:text-white'

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white/30 ${colors}`}
        title={`${label} (${shortcut})`}
      >
        {children}
      </button>
      <span className="text-sm text-white/70 tabular-nums">{label} ({shortcut})</span>
    </div>
  )
}
