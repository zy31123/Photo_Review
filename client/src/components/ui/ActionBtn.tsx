import type { LucideIcon } from 'lucide-react'
import Tooltip from './Tooltip'

type BtnVariant = 'default' | 'danger' | 'success'
type BtnTheme = 'dark' | 'light' | 'ghost'
type BtnSize = 'sm' | 'md'

const VARIANT_HOVER: Record<BtnVariant, string> = {
  default: '',
  danger: 'hover:text-red-400',
  success: 'hover:text-green-400',
}

const THEME_CLASSES: Record<BtnTheme, string> = {
  dark: 'text-white/60 hover:text-white/90',
  light: 'text-text-secondary hover:text-text',
  ghost: 'text-text-secondary hover:text-text hover:bg-fill-subtle',
}

const SIZE_CLASSES: Record<BtnSize, string> = {
  sm: 'w-9 h-9',
  md: 'w-11 h-11',
}

interface ActionBtnProps {
  onClick: () => void
  disabled?: boolean
  variant?: BtnVariant
  theme?: BtnTheme
  size?: BtnSize
  label: string
  shortcut: string
  icon?: LucideIcon
  children?: React.ReactNode
}

export default function ActionBtn({
  onClick, disabled, variant = 'default', theme = 'dark', size = 'md',
  label, shortcut, icon: Icon, children,
}: ActionBtnProps) {
  const variantClass = VARIANT_HOVER[variant]
  const themeClass = THEME_CLASSES[theme]
  const sizeClass = SIZE_CLASSES[size]

  return (
    <Tooltip label={label} shortcut={shortcut}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${sizeClass} rounded-full flex items-center justify-center transition-all duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white/20 ${themeClass} ${variantClass}`}
      >
        {Icon ? <Icon className="size-5" strokeWidth={1.5} /> : children}
      </button>
    </Tooltip>
  )
}
