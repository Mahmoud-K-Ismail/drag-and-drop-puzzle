import React, { useEffect, useCallback, useRef, useState, type ReactNode } from 'react'
import { colorizeCache, colorize, toMonacoLanguage, escapeHtml } from '../../../shared/lib/monacoColorize'
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragMoveEvent,
  PointerSensor,
  useDraggable,
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
import { HintArrowOverlay } from './HintArrowOverlay'
import styles from './PuzzleBoard.module.css'

const INDENT_STEP = 24
const MAX_INDENT = 8

const SLOT_PROXIMITY_PX = 40
/** Short gaps: use almost full height so the lower third doesn't map to the slot below */
const GAP_SLOT_FRACTION = 0.98
/** Taller cards: upper portion maps to this row; higher = harder to accidentally jump to row below while indenting */
const CARD_SLOT_FRACTION = 0.66
/** When dragging the hinted block, expand vertical hit area for the target slot */
const HINT_TARGET_PAD_PX = 16
/** Pixels past the mid-gap between rows before we leave the row we started from (reduces swap-while-indenting) */
const VERTICAL_SLOT_HYSTERESIS_PX = 10

type SlotPickOpts = {
  targetIds: string[]
  activeDragId: string | null
  hintLineId: string | null
  hintTargetSlot: number | null
  /** If set, pointer must cross mid-gap before slot changes vs this index (target-lane reorder only). */
  dragSourceSlot: number | null
}

function computeSlotFromPointer(
  pointerY: number,
  bodyEl: HTMLElement,
  opts: SlotPickOpts,
): number | null {
  const raw = Array.from(bodyEl.querySelectorAll<HTMLElement>('[data-slot-index]'))
  const items: Array<{ rect: DOMRect; slot: number; isGap: boolean }> = []

  for (const el of raw) {
    const rect = el.getBoundingClientRect()
    if (rect.height === 0) continue
    const slot = Number(el.dataset.slotIndex)
    const id = opts.targetIds[slot]
    const isGap = id ? isGapId(id) : false
    items.push({ rect, slot, isGap })
  }

  items.sort((a, b) => a.rect.top - b.rect.top)

  if (items.length === 0) return null

  const first = items[0].rect
  const last = items[items.length - 1].rect
  if (pointerY < first.top - SLOT_PROXIMITY_PX || pointerY > last.bottom + SLOT_PROXIMITY_PX) {
    return null
  }

  if (
    opts.activeDragId
    && opts.hintLineId
    && opts.hintTargetSlot !== null
    && opts.activeDragId === opts.hintLineId
  ) {
    const hintItem = items.find((i) => i.slot === opts.hintTargetSlot)
    if (hintItem) {
      const top = hintItem.rect.top - HINT_TARGET_PAD_PX
      const bottom = hintItem.rect.bottom + HINT_TARGET_PAD_PX
      if (pointerY >= top && pointerY <= bottom) {
        return opts.hintTargetSlot
      }
    }
  }

  let naiveSlot = items[items.length - 1].slot
  for (const { rect, slot, isGap } of items) {
    const frac = isGap ? GAP_SLOT_FRACTION : CARD_SLOT_FRACTION
    if (pointerY < rect.top + rect.height * frac) {
      naiveSlot = slot
      break
    }
  }

  return applyVerticalSlotHysteresis(pointerY, items, naiveSlot, opts.dragSourceSlot)
}

/** Keep the starting row until the pointer crosses the mid-gap to a neighbor (stops indent drags from swapping rows). */
function applyVerticalSlotHysteresis(
  pointerY: number,
  items: Array<{ rect: DOMRect; slot: number; isGap: boolean }>,
  naiveSlot: number,
  dragSourceSlot: number | null,
): number {
  if (dragSourceSlot === null || naiveSlot === dragSourceSlot) return naiveSlot

  const idx = items.findIndex((i) => i.slot === dragSourceSlot)
  if (idx < 0) return naiveSlot

  if (naiveSlot > dragSourceSlot) {
    const cur = items[idx]
    const below = items[idx + 1]
    if (!below) return naiveSlot
    const midY = (cur.rect.bottom + below.rect.top) / 2
    if (pointerY < midY + VERTICAL_SLOT_HYSTERESIS_PX) return dragSourceSlot
    return naiveSlot
  }

  const cur = items[idx]
  const above = items[idx - 1]
  if (!above) return naiveSlot
  const midY = (above.rect.bottom + cur.rect.top) / 2
  if (pointerY > midY - VERTICAL_SLOT_HYSTERESIS_PX) return dragSourceSlot
  return naiveSlot
}

function useMonacoColorize(code: string, language: string): string {
  const lang = toMonacoLanguage(language)
  const key = `${lang}:${code}`
  const [html, setHtml] = useState(() => colorizeCache.get(key) ?? '')

  useEffect(() => {
    let cancelled = false
    const cached = colorizeCache.get(key)
    if (cached) {
      queueMicrotask(() => {
        if (!cancelled) setHtml(cached)
      })
      return () => { cancelled = true }
    }
    colorize(code, lang).then((result) => {
      if (!cancelled) setHtml(result)
    })
    return () => { cancelled = true }
  }, [key, code, lang])

  return html
}

function SortableBlock({
  id,
  code,
  explanation,
  language,
  isHinted,
  tooltipOpen,
  onToggleTooltip,
}: {
  id: string
  code: string
  explanation: string
  language: string
  isHinted?: boolean
  tooltipOpen: boolean
  onToggleTooltip: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { container: 'source' as const },
    transition: { duration: 250, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
  })
  const highlightedCode = useMonacoColorize(code, language)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      data-block-id={id}
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''} ${isHinted ? styles.cardHinted : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className={`${styles.blockActions} ${tooltipOpen ? styles.blockActionsActive : ''}`}>
        <button
          className={styles.infoButton}
          type="button"
          aria-label="Show explanation for this line"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onToggleTooltip(id)
          }}
        >
          ?
        </button>
        {tooltipOpen ? (
          <div
            className={styles.explanationTooltip}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {explanation || 'Loading explanation...'}
          </div>
        ) : null}
      </div>

      <div className={styles.codeContainer}>
        <pre className={styles.codeText}>
          <code dangerouslySetInnerHTML={{ __html: highlightedCode || escapeHtml(code) }} />
        </pre>
      </div>
    </article>
  )
}

function DraggableBlock({
  id,
  slotIndex,
  code,
  explanation,
  indent,
  language,
  incorrect,
  isDropTarget,
  isHinted,
  tooltipOpen,
  onToggleTooltip,
}: {
  id: string
  slotIndex: number
  code: string
  explanation: string
  indent: number
  language: string
  incorrect: boolean
  isDropTarget?: boolean
  isHinted?: boolean
  tooltipOpen: boolean
  onToggleTooltip: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { container: 'target' as const },
  })
  const highlightedCode = useMonacoColorize(code, language)

  const style = {
    marginLeft: `${indent * INDENT_STEP}px`,
    width: `calc(100% - ${indent * INDENT_STEP}px)`,
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
      <div className={`${styles.blockActions} ${tooltipOpen ? styles.blockActionsActive : ''}`}>
        <button
          className={styles.infoButton}
          type="button"
          aria-label="Show explanation for this line"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onToggleTooltip(id)
          }}
        >
          ?
        </button>
        {tooltipOpen ? (
          <div
            className={styles.explanationTooltip}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {explanation || 'Loading explanation...'}
          </div>
        ) : null}
      </div>

      <div className={styles.codeContainer}>
        <pre className={styles.codeText}>
          <code dangerouslySetInnerHTML={{ __html: highlightedCode || escapeHtml(code) }} />
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
  const playAgain = usePuzzleStore((state) => state.playAgain)
  const requestHint = usePuzzleStore((state) => state.requestHint)
  const clearHint = usePuzzleStore((state) => state.clearHint)
  const undo = usePuzzleStore((state) => state.undo)
  const redo = usePuzzleStore((state) => state.redo)
  const [hintOnCooldown, setHintOnCooldown] = useState(false)
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [activeDragWidth, setActiveDragWidth] = useState<number | null>(null)
  const [dropPreviewSlot, setDropPreviewSlot] = useState<number | null>(null)
  const [previewIndent, setPreviewIndent] = useState<number | null>(null)
  const [hintCooldownTick, setHintCooldownTick] = useState(0)
  const targetBodyRef = useRef<HTMLDivElement>(null)
  const sourceLaneRef = useRef<Element | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const toggleTooltip = useCallback((blockId: string) => {
    setOpenTooltipId((prev) => (prev === blockId ? null : blockId))
  }, [])

  useEffect(() => {
    if (!openTooltipId) return
    function dismiss(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.closest(`.${styles.infoButton}`) || target.closest(`.${styles.explanationTooltip}`)) return
      setOpenTooltipId(null)
    }
    document.addEventListener('pointerdown', dismiss, true)
    return () => document.removeEventListener('pointerdown', dismiss, true)
  }, [openTooltipId])

  useEffect(() => {
    if (!hintOnCooldown) return
    const timer = setInterval(() => setHintCooldownTick((n) => n + 1), 1000)
    return () => clearInterval(timer)
  }, [hintOnCooldown])

  useEffect(() => {
    const now = Date.now()
    if (hintCooldownUntil <= now) { setHintOnCooldown(false); return }
    setHintOnCooldown(true)
    const timer = setTimeout(() => setHintOnCooldown(false), hintCooldownUntil - now)
    return () => clearTimeout(timer)
  }, [hintCooldownUntil])

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
    setOpenTooltipId(null)
    setActiveDragId(String(event.active.id))
    setActiveDragWidth(event.active.rect.current.initial?.width ?? null)
    if (!sourceLaneRef.current) {
      sourceLaneRef.current = document.querySelector('[data-lane="source"]')
    }
  }

  const dragSourceSlot =
    activeDragId !== null && targetIds.includes(activeDragId)
      ? targetIds.indexOf(activeDragId)
      : null

  const slotPickOpts: SlotPickOpts = {
    targetIds,
    activeDragId,
    hintLineId,
    hintTargetSlot,
    dragSourceSlot,
  }

  function handleDragMove(event: DragMoveEvent) {
    if (!targetBodyRef.current) return
    const { x, y } = getPointer(event)
    const targetLane = targetBodyRef.current.closest('[data-lane="target"]')

    if (isPointInElement(x, y, targetLane)) {
      const slot = computeSlotFromPointer(y, targetBodyRef.current, slotPickOpts)
      if (slot !== null) {
        setDropPreviewSlot((prev) => (prev === slot ? prev : slot))
        const indent = computeIndent(event)
        setPreviewIndent((prev) => (prev === indent ? prev : indent))
      } else {
        setDropPreviewSlot((prev) => (prev === null ? prev : null))
        setPreviewIndent((prev) => (prev === null ? prev : null))
      }
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
      const slotIndex = computeSlotFromPointer(y, targetBodyRef.current, {
        ...slotPickOpts,
        activeDragId: activeId,
      })
      if (slotIndex !== null) {
        moveLine(activeId, 'target', slotIndex)
        setIndent(activeId, computeIndent(event))
      }
    } else {
      moveLine(activeId, 'source')
    }
  }

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
  const isDragActive = activeDragId !== null

  /* Live wall-clock countdown; tick state only forces re-renders every second */
  const hintCooldownSecondsLeft = hintOnCooldown
    // eslint-disable-next-line react-hooks/purity -- derived from Date.now() for button label
    ? Math.max(0, Math.ceil((hintCooldownUntil - Date.now()) / 1000))
    : 0
  void hintCooldownTick

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
            <div className={styles.boardHintCol}>
              <p className={styles.boardHint}>Drag blocks from left to right, then fine-tune indentation in the solution area.</p>
            </div>
            <div className={styles.controlsRow}>
              <button className={`${styles.ghostButton} ${styles.undoButton}`} type="button" onClick={undo} disabled={pastCount === 0}>
                Undo
              </button>
              <button className={`${styles.ghostButton} ${styles.redoButton}`} type="button" onClick={redo} disabled={futureCount === 0}>
                Redo
              </button>
              <button
                className={`${styles.ghostButton} ${styles.hintButton}`}
                type="button"
                onClick={requestHint}
                disabled={hintOnCooldown}
                aria-label={hintOnCooldown ? `Hint on cooldown, ${hintCooldownSecondsLeft} seconds left` : 'Request a hint'}
              >
                {hintOnCooldown ? `Hint (${hintCooldownSecondsLeft}s)` : 'Hint'}
              </button>
              <button className={styles.checkButton} type="button" onClick={checkSolution}>
                Check Solution
              </button>
            </div>
          </div>
          <div
            className={`${styles.hintStrip} ${hintMessage ? styles.hintStripActive : ''}`}
            aria-live="polite"
          >
            {hintMessage ? (
              <p className={styles.hintText} onClick={clearHint} role="status">
                {hintMessage}
                <span className={styles.hintDismiss}>dismiss</span>
              </p>
            ) : (
              <div className={styles.hintStripPlaceholder} aria-hidden />
            )}
          </div>

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
                      language={language}
                      tooltipOpen={openTooltipId === line.id}
                      onToggleTooltip={toggleTooltip}
                      isHinted={hintLineId === line.id}
                    />
                  )
                })}
              </Lane>
            </SortableContext>

              <Lane laneId="target" title="Solution Area" subtitle="Drop and arrange lines here" bodyRef={targetBodyRef}>
                <div className={styles.indentRuler} aria-hidden="true">
                  {Array.from({ length: MAX_INDENT + 1 }, (_, i) => (
                    <div
                      key={i}
                      className={`${styles.indentTick} ${isDragActive && previewIndent === i ? styles.indentTickActive : ''}`}
                    />
                  ))}
                </div>
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
                    <DraggableBlock
                      key={line.id}
                      id={line.id}
                      slotIndex={slotIndex}
                      code={line.code}
                      explanation={line.explanation}
                      indent={indentById[line.id] ?? 0}
                      language={language}
                      incorrect={incorrectSet.has(line.id)}
                      isDropTarget={isDragActive && dropPreviewSlot === slotIndex}
                      isHinted={hintLineId === line.id}
                      tooltipOpen={openTooltipId === line.id}
                      onToggleTooltip={toggleTooltip}
                    />
                  )
                })}
              </Lane>
          </div>
        </section>
        <DragOverlay zIndex={2000} dropAnimation={null}>
          {activeLine ? (
            <article
              className={`${styles.card} ${styles.cardDragging} ${styles.overlayCard}`}
              style={{ width: activeDragWidth ? `${activeDragWidth}px` : undefined }}
            >
              <div className={styles.codeContainer}>
                <pre className={styles.codeText}>
                  <code
                    dangerouslySetInnerHTML={{
                      __html: colorizeCache.get(`${toMonacoLanguage(language)}:${activeLine.code}`) || escapeHtml(activeLine.code),
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
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalButtonPrimary} onClick={playAgain}>
                Play again
              </button>
              <button type="button" className={styles.modalButtonSecondary} onClick={dismissSolved}>
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
