import React, { useEffect, useRef, useState, type ReactNode } from 'react'
import hljs from 'highlight.js/lib/core'
import cpp from 'highlight.js/lib/languages/cpp'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import typescript from 'highlight.js/lib/languages/typescript'
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragMoveEvent,
  PointerSensor,
  useDroppable,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePuzzleStore, isGapId } from '../../../features/puzzle/model/puzzle.store'
import styles from './PuzzleBoard.module.css'

const INDENT_STEP = 24
const MAX_INDENT = 8

function computeSlotFromPointer(
  pointerY: number,
  bodyEl: HTMLElement,
): number {
  const raw = Array.from(bodyEl.querySelectorAll<HTMLElement>('[data-slot-index]'))
  const items: Array<{ rect: DOMRect; slot: number }> = []

  for (const el of raw) {
    const rect = el.getBoundingClientRect()
    if (rect.height === 0) continue
    items.push({ rect, slot: Number(el.dataset.slotIndex) })
  }

  for (const { rect, slot } of items) {
    if (pointerY < rect.top + rect.height * 0.65) return slot
  }

  return items.length > 0 ? items[items.length - 1].slot : 0
}

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('cpp', cpp)

function toHighlightLanguage(language: string) {
  switch (language.toLowerCase()) {
    case 'c++':
      return 'cpp'
    default:
      return language.toLowerCase()
  }
}

function SortableBlock({
  id,
  slotIndex,
  code,
  explanation,
  indent,
  language,
  container,
  incorrect,
  isDropTarget,
  isHinted,
}: {
  id: string
  slotIndex?: number
  code: string
  explanation: string
  indent: number
  language: string
  container: 'source' | 'target'
  incorrect: boolean
  isDropTarget?: boolean
  isHinted?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { container },
    transition: { duration: 250, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
  })
  const [showExplanation, setShowExplanation] = useState(false)
  const highlightLanguage = toHighlightLanguage(language)
  const highlightedCode = hljs.highlight(code, {
    language: hljs.getLanguage(highlightLanguage) ? highlightLanguage : 'plaintext',
    ignoreIllegals: true,
  }).value

  const adjustedTransform = container === 'source' ? transform : isDragging ? transform : null

  const style = {
    transform: CSS.Transform.toString(adjustedTransform),
    transition: container === 'source' ? transition : undefined,
    marginLeft: container === 'target' ? `${indent * INDENT_STEP}px` : '0px',
    width: container === 'target' ? `calc(100% - ${indent * INDENT_STEP}px)` : '100%',
    opacity: isDragging ? 0 : 1,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      data-block-id={id}
      data-slot-index={slotIndex}
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''} ${incorrect ? styles.cardIncorrect : ''} ${isDropTarget ? styles.cardDropTarget : ''} ${isHinted ? styles.cardHinted : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className={styles.blockActions}>
        <button
          className={styles.infoButton}
          type="button"
          aria-label="Show explanation for this line"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            setShowExplanation((current) => !current)
          }}
        >
          ?
        </button>
      </div>

      {showExplanation ? <p className={styles.explanation}>{explanation}</p> : null}

      <div className={styles.codeContainer}>
        <pre className={`${styles.codeText} hljs`}>
          <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        </pre>
      </div>
    </article>
  )
}

function Lane({
  laneId,
  title,
  subtitle,
  bodyRef,
  children,
}: {
  laneId: 'source' | 'target'
  title: string
  subtitle: string
  bodyRef?: React.RefObject<HTMLDivElement | null>
  children: ReactNode
}) {
  const { setNodeRef } = useDroppable({ id: laneId })

  return (
    <section ref={setNodeRef} className={styles.lane} data-lane={laneId}>
      <header className={styles.laneHeader}>
        <h3 className={styles.laneTitle}>{title}</h3>
        <p className={styles.laneSubtitle}>{subtitle}</p>
      </header>
      <div ref={bodyRef} className={styles.laneBody}>{children}</div>
    </section>
  )
}

function HintArrowOverlay({
  fromId,
  targetSlot,
  targetBodyRef,
}: {
  fromId: string
  targetSlot: number
  targetBodyRef: React.RefObject<HTMLDivElement | null>
}) {
  const [coords, setCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)

  useEffect(() => {
    function measure() {
      const fromEl = document.querySelector(`[data-block-id="${fromId}"]`)
      const toEl = targetBodyRef.current?.querySelector(`[data-slot-index="${targetSlot}"]`)
      if (!fromEl || !toEl) { setCoords(null); return }

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
  }, [fromId, targetSlot, targetBodyRef])

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
        <marker id="hint-arrowhead" markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto">
          <polygon points="0 0, 12 5, 0 10" fill="#26b785" />
        </marker>
      </defs>
      <path
        d={path}
        fill="none"
        stroke="#26b785"
        strokeWidth="3"
        strokeDasharray="10 5"
        markerEnd="url(#hint-arrowhead)"
        className={styles.hintArrowPath}
      />
    </svg>
  )
}

export function PuzzleBoard() {
  const lines = usePuzzleStore((state) => state.lines)
  const isLoading = usePuzzleStore((state) => state.isLoading)
  const language = usePuzzleStore((state) => state.language)
  const sourceIds = usePuzzleStore((state) => state.sourceIds)
  const targetIds = usePuzzleStore((state) => state.targetIds)
  const indentById = usePuzzleStore((state) => state.indentById)
  const incorrectIds = usePuzzleStore((state) => state.incorrectIds)
  const isSolved = usePuzzleStore((state) => state.isSolved)
  const hintMessage = usePuzzleStore((state) => state.hintMessage)
  const hintLineId = usePuzzleStore((state) => state.hintLineId)
  const hintTargetSlot = usePuzzleStore((state) => state.hintTargetSlot)
  const hintCooldownUntil = usePuzzleStore((state) => state.hintCooldownUntil)
  const pastCount = usePuzzleStore((state) => state.past.length)
  const futureCount = usePuzzleStore((state) => state.future.length)
  const moveLine = usePuzzleStore((state) => state.moveLine)
  const setIndent = usePuzzleStore((state) => state.setIndent)
  const checkSolution = usePuzzleStore((state) => state.checkSolution)
  const dismissSolved = usePuzzleStore((state) => state.dismissSolved)
  const requestHint = usePuzzleStore((state) => state.requestHint)
  const clearHint = usePuzzleStore((state) => state.clearHint)
  const undo = usePuzzleStore((state) => state.undo)
  const redo = usePuzzleStore((state) => state.redo)
  const [hintOnCooldown, setHintOnCooldown] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [activeDragWidth, setActiveDragWidth] = useState<number | null>(null)
  const [dropPreviewSlot, setDropPreviewSlot] = useState<number | null>(null)
  const [previewIndent, setPreviewIndent] = useState<number | null>(null)
  const targetBodyRef = useRef<HTMLDivElement>(null)
  const sourceLaneRef = useRef<Element | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  function getPointer(event: DragMoveEvent | DragEndEvent) {
    const origin = event.activatorEvent as PointerEvent
    return { x: origin.clientX + event.delta.x, y: origin.clientY + event.delta.y }
  }

  function isPointInElement(px: number, py: number, el: Element | null | undefined): boolean {
    if (!el) return false
    const r = el.getBoundingClientRect()
    return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom
  }

  function computeIndent(event: DragMoveEvent | DragEndEvent): number {
    if (!targetBodyRef.current) return 0
    const bodyRect = targetBodyRef.current.getBoundingClientRect()
    const bodyPadding = parseFloat(getComputedStyle(targetBodyRef.current).paddingLeft) || 0
    const contentLeft = bodyRect.left + bodyPadding
    const initialLeft = event.active.rect.current.initial?.left ?? 0
    const dropLeftEdge = initialLeft + event.delta.x
    const rawIndent = (dropLeftEdge - contentLeft) / INDENT_STEP
    return Math.max(0, Math.min(MAX_INDENT, Math.round(rawIndent)))
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id))
    setActiveDragWidth(event.active.rect.current.initial?.width ?? null)
    if (!sourceLaneRef.current) {
      sourceLaneRef.current = document.querySelector('[data-lane="source"]')
    }
  }

  function handleDragMove(event: DragMoveEvent) {
    if (!targetBodyRef.current) return
    const { x, y } = getPointer(event)
    const targetLane = targetBodyRef.current.closest('[data-lane="target"]')

    if (isPointInElement(x, y, targetLane)) {
      const slot = computeSlotFromPointer(y, targetBodyRef.current)
      setDropPreviewSlot((prev) => (prev === slot ? prev : slot))

      const indent = computeIndent(event)
      setPreviewIndent((prev) => (prev === indent ? prev : indent))
    } else {
      setDropPreviewSlot((prev) => (prev === null ? prev : null))
      setPreviewIndent((prev) => (prev === null ? prev : null))
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    setActiveDragWidth(null)
    setDropPreviewSlot(null)
    setPreviewIndent(null)

    const activeId = String(event.active.id)
    const { x, y } = getPointer(event)
    const targetLane = targetBodyRef.current?.closest('[data-lane="target"]')

    let overContainer: 'source' | 'target' | null = null

    if (isPointInElement(x, y, targetLane)) {
      overContainer = 'target'
    } else if (isPointInElement(x, y, sourceLaneRef.current)) {
      overContainer = 'source'
    } else if (event.over) {
      const overId = String(event.over.id)
      overContainer = overId === 'source' || sourceIds.includes(overId) ? 'source' : 'target'
    }

    if (!overContainer) return

    if (overContainer === 'target' && targetBodyRef.current) {
      const slotIndex = computeSlotFromPointer(y, targetBodyRef.current)
      moveLine(activeId, 'target', slotIndex)
      setIndent(activeId, computeIndent(event))
    } else {
      moveLine(activeId, 'source')
    }
  }

  useEffect(() => {
    if (!hintLineId) return
    const timer = setTimeout(clearHint, 8000)
    return () => clearTimeout(timer)
  }, [hintLineId, clearHint])

  useEffect(() => {
    const now = Date.now()
    if (hintCooldownUntil <= now) { setHintOnCooldown(false); return }
    setHintOnCooldown(true)
    const timer = setTimeout(() => setHintOnCooldown(false), hintCooldownUntil - now)
    return () => clearTimeout(timer)
  }, [hintCooldownUntil])

  useEffect(() => {
    if (!hintLineId) return
    const el = document.querySelector(`[data-block-id="${hintLineId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [hintLineId])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMeta = event.metaKey || event.ctrlKey

      if (!isMeta) return

      const key = event.key.toLowerCase()

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
        return
      }

      if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [redo, undo])

  if (isLoading) {
    return (
      <section className={styles.loadingWrap}>
        <div className={styles.loadingPulse} />
        <p className={styles.loadingTitle}>Generating your puzzle...</p>
        <p className={styles.loadingSubtitle}>We are building code blocks and line-by-line explanations.</p>
      </section>
    )
  }

  if (lines.length === 0) {
    return <div className={styles.empty}>Generated code blocks will appear here.</div>
  }

  const lineById = Object.fromEntries(lines.map((line) => [line.id, line]))
  const incorrectSet = new Set(incorrectIds)
  const activeLine = activeDragId ? lineById[activeDragId] : undefined
  const targetBlockIds = targetIds.filter((id) => !isGapId(id))
  const isDragActive = activeDragId !== null

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragCancel={() => {
          setActiveDragId(null)
          setActiveDragWidth(null)
          setDropPreviewSlot(null)
          setPreviewIndent(null)
        }}
        onDragEnd={handleDragEnd}
      >
        <section className={styles.board}>
          <div className={styles.boardTopRow}>
            <div>
              <p className={styles.boardHint}>Drag blocks from left to right, then fine-tune indentation in the solution area.</p>
            </div>
            <div className={styles.controlsRow}>
              <button className={`${styles.ghostButton} ${styles.undoButton}`} type="button" onClick={undo} disabled={pastCount === 0}>
                Undo
              </button>
              <button className={`${styles.ghostButton} ${styles.redoButton}`} type="button" onClick={redo} disabled={futureCount === 0}>
                Redo
              </button>
              <button className={`${styles.ghostButton} ${styles.hintButton}`} type="button" onClick={requestHint} disabled={hintOnCooldown}>
                Hint
              </button>
              <button className={styles.checkButton} type="button" onClick={checkSolution}>
                Check Solution
              </button>
            </div>
          </div>
          {hintMessage ? (
            <p className={styles.hintText} onClick={clearHint} role="status">
              {hintMessage}
              <span className={styles.hintDismiss}>dismiss</span>
            </p>
          ) : null}

          <div className={styles.lanesGrid}>
            <SortableContext items={sourceIds} strategy={verticalListSortingStrategy}>
              <Lane laneId="source" title="Code Bank" subtitle="Unplaced lines">
                {sourceIds.length === 0 ? <p className={styles.emptyLane}>All lines are moved to the solution.</p> : null}
                {sourceIds.map((id) => {
                  const line = lineById[id]
                  if (!line) return null

                  return (
                    <SortableBlock
                      key={line.id}
                      id={line.id}
                      code={line.code}
                      explanation={line.explanation}
                      indent={0}
                      language={language}
                      container="source"
                      incorrect={false}
                      isHinted={hintLineId === line.id}
                    />
                  )
                })}
              </Lane>
            </SortableContext>

            <SortableContext items={targetBlockIds} strategy={verticalListSortingStrategy}>
              <Lane laneId="target" title="Solution Area" subtitle="Drop and arrange lines here" bodyRef={targetBodyRef}>
                {isDragActive ? (
                  <div className={styles.indentRuler} aria-hidden="true">
                    {Array.from({ length: MAX_INDENT + 1 }, (_, i) => (
                      <div
                        key={i}
                        className={`${styles.indentTick} ${previewIndent === i ? styles.indentTickActive : ''}`}
                      />
                    ))}
                  </div>
                ) : null}
                {targetIds.map((id, slotIndex) => {
                  const isHintTarget = hintTargetSlot === slotIndex && hintLineId !== null
                  if (isGapId(id)) {
                    let gapClass = styles.gapSlot
                    if (isDragActive && dropPreviewSlot === slotIndex) gapClass = styles.gapSlotHovered
                    else if (isHintTarget) gapClass = styles.gapSlotHintTarget

                    return (
                      <div
                        key={id}
                        data-slot-index={slotIndex}
                        className={gapClass}
                      />
                    )
                  }
                  const line = lineById[id]
                  if (!line) return null
                  return (
                    <SortableBlock
                      key={line.id}
                      id={line.id}
                      slotIndex={slotIndex}
                      code={line.code}
                      explanation={line.explanation}
                      indent={indentById[line.id] ?? 0}
                      language={language}
                      container="target"
                      incorrect={incorrectSet.has(line.id)}
                      isDropTarget={isDragActive && dropPreviewSlot === slotIndex}
                      isHinted={hintLineId === line.id}
                    />
                  )
                })}
              </Lane>
            </SortableContext>
          </div>
        </section>
        <DragOverlay zIndex={2000} dropAnimation={null}>
          {activeLine ? (
            <article
              className={`${styles.card} ${styles.cardDragging} ${styles.overlayCard}`}
              style={{ width: activeDragWidth ? `${activeDragWidth}px` : undefined }}
            >
              <div className={styles.codeContainer}>
                <pre className={`${styles.codeText} hljs`}>
                  <code
                    dangerouslySetInnerHTML={{
                      __html: hljs.highlight(activeLine.code, {
                        language: hljs.getLanguage(toHighlightLanguage(language)) ? toHighlightLanguage(language) : 'plaintext',
                        ignoreIllegals: true,
                      }).value,
                    }}
                  />
                </pre>
              </div>
            </article>
          ) : null}
        </DragOverlay>
      </DndContext>

      {hintLineId && hintTargetSlot !== null ? (
        <HintArrowOverlay fromId={hintLineId} targetSlot={hintTargetSlot} targetBodyRef={targetBodyRef} />
      ) : null}

      {isSolved ? (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="Puzzle solved">
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Great work, puzzle solved.</h3>
            <p className={styles.modalText}>Your line order and indentation are correct.</p>
            <button type="button" className={styles.modalButton} onClick={dismissSolved}>
              Continue
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
