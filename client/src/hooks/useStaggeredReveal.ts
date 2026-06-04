import { useEffect, useRef, useState } from 'react'

export function useStaggeredReveal(staggerMs = 50) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const childStyle = (index: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(12px)',
    transition: `opacity 300ms ${index * staggerMs}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 300ms ${index * staggerMs}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
  })

  return { ref, visible, childStyle }
}
