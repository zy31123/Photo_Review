export default function SectionHeader({ title, compact }: { title: string; compact?: boolean }) {
  return (
    <div className={compact ? 'px-4 py-2.5 border-b border-black/[0.04] bg-black/[0.02]' : 'px-5 py-3 border-b border-black/[0.04]'}>
      <h3 className="text-xs font-semibold text-text-muted">
        {title}
      </h3>
    </div>
  )
}
