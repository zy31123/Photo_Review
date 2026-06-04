import type { LucideIcon } from 'lucide-react'
import Tooltip from './Tooltip'

type BtnVariant = 'default' | 'danger' | 'success'
type BtnTheme = 'dark' | 'light' | 'ghost'

const VARIANT_HOVER: Record<BtnVariant, string> = {
  default: '',
  danger: 'hover:text-red-400',
  success: 'hover:text-green-400',
}

const THEME_CLASSES: Record<BtnTheme, string> = {
  dark: 'text-white/60 hover:text-white/80',
  light: 'text-text-secondary hover:text-text',
  ghost: 'text-text-secondary hover:text-text hover:bg-fill-subtle',
}

interface ActionBtnProps {
  onClick: () => void
  disabled?: boolean
  variant?: BtnVariant
  theme?: BtnTheme
  label: string
  shortcut: string
  icon?: LucideIcon
  children?: React.ReactNode
}

export default function ActionBtn({
  onClick, disabled, variant = 'default', theme = 'dark',
  label, shortcut, icon: Icon, children,
}: ActionBtnProps) {
  const variantClass = VARIANT_HOVER[variant]
  const themeClass = THEME_CLASSES[theme]

  return (
    <Tooltip label={label} shortcut={shortcut}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-fast disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white/20 ${themeClass} ${variantClass}`}
      >
        {Icon ? <Icon className="size-5" strokeWidth={1.5} /> : children}
      </button>
    </Tooltip>
  )
}
