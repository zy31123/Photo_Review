import { useState, useCallback, useRef } from 'react'

const MIN_SCALE = 1
const MAX_SCALE = 5
const ZOOM_FACTOR = 0.1

export function useImageZoom() {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const positionRef = useRef({ x: 0, y: 0 })

  const resetZoom = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    scaleRef.current = 1
    positionRef.current = { x: 0, y: 0 }
  }, [])

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey) return false

    e.preventDefault()
    const currentScale = scaleRef.current
    const delta = e.deltaY > 0 ? -ZOOM_FACTOR : ZOOM_FACTOR
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, currentScale + delta))
    if (newScale === currentScale) return true

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const ratio = newScale / currentScale

    const newPos = {
      x: mouseX - ratio * (mouseX - positionRef.current.x),
      y: mouseY - ratio * (mouseY - positionRef.current.y),
    }
    positionRef.current = newPos
    scaleRef.current = newScale
    setPosition(newPos)
    setScale(newScale)
    return true
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scaleRef.current <= 1 || e.button !== 0) return
    e.preventDefault()
    dragging.current = true
    dragStart.current = { x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const newPos = {
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    }
    positionRef.current = newPos
    setPosition(newPos)
  }, [])

  const handleMouseUp = useCallback(() => {
    dragging.current = false
  }, [])

  const handleDoubleClick = useCallback(() => {
    resetZoom()
  }, [resetZoom])

  const zoomStyle = scale > 1
    ? { transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, cursor: dragging.current ? 'grabbing' : 'grab' }
    : undefined

  return {
    scale,
    resetZoom,
    zoomStyle,
    handleWheel,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onDoubleClick: handleDoubleClick,
      onMouseLeave: handleMouseUp,
    },
  }
}
