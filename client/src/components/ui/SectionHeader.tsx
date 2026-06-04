export default function SectionHeader({ title, compact }: { title: string; compact?: boolean }) {
  return (
    <div className={compact ? 'px-4 py-2.5 border-b border-border-faint bg-fill-subtle' : 'px-5 py-3 border-b border-border-faint'}>
      <h3 className="text-[0.6875rem] uppercase tracking-widest font-bold text-text-secondary">
        {title}
      </h3>
    </div>
  )
}
