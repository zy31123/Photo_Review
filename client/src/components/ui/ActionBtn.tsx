import Tooltip from './Tooltip'

const VARIANT_COLORS: Record<string, string> = {
  danger: 'hover:text-red-400',
  success: 'hover:text-green-400',
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
  const colors = variant ? VARIANT_COLORS[variant] : 'hover:text-white/90'

  return (
    <Tooltip label={label} shortcut={shortcut}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-12 h-12 rounded-full flex items-center justify-center text-white/60 transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white/20 ${colors}`}
      >
        {children}
      </button>
    </Tooltip>
  )
}
