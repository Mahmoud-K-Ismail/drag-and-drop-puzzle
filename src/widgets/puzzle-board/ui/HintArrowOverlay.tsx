import React, { useEffect, useId, useState } from 'react'
import styles from './PuzzleBoard.module.css'

type HintArrowOverlayProps = {
  fromId: string
  targetSlot: number
  targetBodyRef: React.RefObject<HTMLDivElement | null>
  /** Which data attribute identifies the drop/list row (default: solution slots). */
  targetIndexAttr?: 'data-slot-index' | 'data-order-index'
}

export function HintArrowOverlay({
  fromId,
  targetSlot,
  targetBodyRef,
  targetIndexAttr = 'data-slot-index',
}: HintArrowOverlayProps) {
  const markerId = useId().replace(/:/g, '')
  const [coords, setCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)

  useEffect(() => {
    function measure() {
      const fromEl = document.querySelector(`[data-block-id="${fromId}"]`)
      const attr = targetIndexAttr === 'data-order-index' ? 'data-order-index' : 'data-slot-index'
      const toEl = targetBodyRef.current?.querySelector(`[${attr}="${targetSlot}"]`)
      if (!fromEl || !toEl) {
        setCoords(null)
        return
      }

      const from = fromEl.getBoundingClientRect()
      const to = toEl.getBoundingClientRect()
      setCoords({
        x1: from.left + from.width / 2,
        y1: from.top + from.height / 2,
        x2: to.left + to.width / 2,
        y2: to.top + to.height / 2,
      })
    }

    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    const raf = requestAnimationFrame(measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
      cancelAnimationFrame(raf)
    }
  }, [fromId, targetSlot, targetBodyRef, targetIndexAttr])

  if (!coords) return null

  const { x1, y1, x2, y2 } = coords
  const sameLane = Math.abs(x2 - x1) < 200

  let cx: number
  let cy: number
  if (sameLane) {
    cx = x1 + 80
    cy = (y1 + y2) / 2
  } else {
    cx = (x1 + x2) / 2
    cy = Math.min(y1, y2) - 30
  }

  const path = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`

  return (
    <svg className={styles.hintArrowSvg} aria-hidden="true">
      <defs>
        <marker id={markerId} markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto">
          <polygon points="0 0, 12 5, 0 10" fill="#26b785" />
        </marker>
      </defs>
      <path
        d={path}
        fill="none"
        stroke="#26b785"
        strokeWidth="3"
        strokeDasharray="10 5"
        markerEnd={`url(#${markerId})`}
        className={styles.hintArrowPath}
      />
    </svg>
  )
}
