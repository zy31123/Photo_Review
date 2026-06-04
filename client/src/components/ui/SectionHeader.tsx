export default function SectionHeader({ title, compact }: { title: string; compact?: boolean }) {
  return (
    <div className={compact ? 'px-4 py-2 border-b border-border-subtle bg-fill-subtle' : 'px-4 py-2.5 border-b border-border-subtle'}>
      <h3 className="text-micro uppercase tracking-wider font-semibold text-text-secondary">
        {title}
      </h3>
    </div>
  )
}
