export default function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 py-3.5 border-b border-border/30">
      <h3 className="text-sm font-semibold tracking-widest uppercase text-text-secondary font-body">
        {title}
      </h3>
    </div>
  )
}
