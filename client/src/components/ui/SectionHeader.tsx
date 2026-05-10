export default function SectionHeader({ title, compact }: { title: string; compact?: boolean }) {
  return (
    <div className={compact ? 'px-4 py-2.5 border-b border-border/20 bg-bg-raised/50' : 'px-5 py-3 border-b border-border/30'}>
      <h3 className="text-sm font-semibold tracking-widest uppercase text-text-secondary font-body">
        {title}
      </h3>
    </div>
  )
}
