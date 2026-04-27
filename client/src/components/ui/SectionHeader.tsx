export default function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 py-2 border-b border-border/30">
      <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-text-muted font-body">
        {title}
      </h3>
    </div>
  )
}
