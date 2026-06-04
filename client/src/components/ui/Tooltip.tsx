interface TooltipProps {
  label: string
  shortcut?: string
  position?: 'top' | 'bottom'
  children: React.ReactNode
}

export default function Tooltip({ label, shortcut, position = 'top', children }: TooltipProps) {
  const positionClass = position === 'top'
    ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
    : 'top-full left-1/2 -translate-x-1/2 mt-2'

  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        className={`${positionClass} absolute rounded-sm bg-black/75 px-2 py-1 text-micro whitespace-nowrap text-white opacity-0 pointer-events-none transition-opacity duration-fast group-hover/tooltip:opacity-100 z-50`}
      >
        {label}
        {shortcut && (
          <kbd className="ml-1.5 text-white/50">{shortcut}</kbd>
        )}
      </span>
    </span>
  )
}
