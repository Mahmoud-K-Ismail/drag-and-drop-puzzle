import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { colorize, colorizeCache, escapeHtml, toMonacoLanguage } from '../../../shared/lib/monacoColorize'
import { usePuzzleStore } from '../../../features/puzzle/model/puzzle.store'
import { HintArrowOverlay } from '../../puzzle-board/ui/HintArrowOverlay'
import puzzleStyles from '../../puzzle-board/ui/PuzzleBoard.module.css'
import styles from './OrderingBoard.module.css'

const MAX_INDENT = 8
/** Same step as PuzzleBoard target lane (`INDENT_STEP`) */
const INDENT_STEP = 24

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

function OrderingLineCard({
  id,
  orderIndex,
  code,
  explanation,
  language,
  indent,
  incorrect,
  isHinted,
  isHintTarget,
  isRulerLineFocused,
  tooltipOpen,
  onToggleTooltip,
  onIndentDelta,
  onRowPointerEnter,
  onRowPointerLeave,
}: {
  id: string
  orderIndex: number
  code: string
  explanation: string
  language: string
  indent: number
  incorrect: boolean
  isHinted?: boolean
  isHintTarget?: boolean
  isRulerLineFocused: boolean
  tooltipOpen: boolean
  onToggleTooltip: (id: string) => void
  onIndentDelta: (id: string, delta: number) => void
  onRowPointerEnter: (id: string) => void
  onRowPointerLeave: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const highlightedCode = useMonacoColorize(code, language)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${indent * INDENT_STEP}px`,
    opacity: isDragging ? 0.35 : 1,
  }

  const curIndent = indent

  return (
    <div
      className={`${styles.orderingRow} ${isHintTarget ? styles.orderingRowHintTarget : ''} ${isRulerLineFocused ? styles.orderingRowRulerFocus : ''}`}
      data-ordering-row=""
      data-order-index={orderIndex}
      onPointerEnter={() => onRowPointerEnter(id)}
      onPointerLeave={() => onRowPointerLeave()}
    >
      <div className={`${styles.indentGutter} ${isRulerLineFocused ? styles.indentGutterLive : ''}`}>
        <button
          type="button"
          className={styles.indentStepBtn}
          aria-label="Decrease indent"
          disabled={curIndent <= 0}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onIndentDelta(id, -1)
          }}
        >
          −
        </button>
        <button
          type="button"
          className={styles.indentStepBtn}
          aria-label="Increase indent"
          disabled={curIndent >= MAX_INDENT}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onIndentDelta(id, 1)
          }}
        >
          +
        </button>
      </div>
      <article
        ref={setNodeRef}
        style={style}
        data-block-id={id}
        className={`${puzzleStyles.card} ${styles.orderingLineCard} ${isDragging ? puzzleStyles.cardDragging : ''} ${incorrect ? puzzleStyles.cardIncorrect : ''} ${isHinted ? puzzleStyles.cardHinted : ''}`}
        {...attributes}
        {...listeners}
      >
        {/* One tight row: code + ? (avoids tall cards and full-width bars) */}
        <div className={styles.orderingCodeMetaRow}>
          <div className={`${puzzleStyles.codeContainer} ${styles.orderingCodeWrap}`}>
            <pre className={`${puzzleStyles.codeText} ${styles.orderingCodeText}`}>
              <code dangerouslySetInnerHTML={{ __html: highlightedCode || escapeHtml(code) }} />
            </pre>
          </div>
          <div className={`${styles.orderingHelpWrap} ${tooltipOpen ? styles.orderingHelpWrapOpen : ''}`}>
            <button
              className={puzzleStyles.infoButton}
              type="button"
              aria-label="Show explanation for this line"
              aria-expanded={tooltipOpen}
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
                className={`${puzzleStyles.explanationTooltip} ${styles.orderingExplanationTooltip}`}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {explanation || 'No explanation.'}
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  )
}

export function OrderingBoard() {
  const lines = usePuzzleStore((state) => state.lines)
  const isLoading = usePuzzleStore((state) => state.isLoading)
  const language = usePuzzleStore((state) => state.language)
  const orderingIds = usePuzzleStore((state) => state.orderingIds)
  const indentById = usePuzzleStore((state) => state.indentById)
  const incorrectIds = usePuzzleStore((state) => state.incorrectIds)
  const isSolved = usePuzzleStore((state) => state.isSolved)
  const hintMessage = usePuzzleStore((state) => state.hintMessage)
  const hintLineId = usePuzzleStore((state) => state.hintLineId)
  const hintTargetSlot = usePuzzleStore((state) => state.hintTargetSlot)
  const hintCooldownUntil = usePuzzleStore((state) => state.hintCooldownUntil)
  const pastCount = usePuzzleStore((state) => state.past.length)
  const futureCount = usePuzzleStore((state) => state.future.length)
  const reorderOrdering = usePuzzleStore((state) => state.reorderOrdering)
  const setIndent = usePuzzleStore((state) => state.setIndent)
  const checkSolution = usePuzzleStore((state) => state.checkSolution)
  const dismissSolved = usePuzzleStore((state) => state.dismissSolved)
  const playAgain = usePuzzleStore((state) => state.playAgain)
  const requestHint = usePuzzleStore((state) => state.requestHint)
  const clearHint = usePuzzleStore((state) => state.clearHint)
  const undo = usePuzzleStore((state) => state.undo)
  const redo = usePuzzleStore((state) => state.redo)

  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [dragOverlaySize, setDragOverlaySize] = useState<{ row: number; article: number } | null>(null)
  const [hintOnCooldown, setHintOnCooldown] = useState(false)
  const [hintCooldownTick, setHintCooldownTick] = useState(0)
  /** Line id driving the indent ruler + gutter highlight (hover or drag) */
  const [rulerFocusLineId, setRulerFocusLineId] = useState<string | null>(null)
  const rulerLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listBodyRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const toggleTooltip = useCallback((blockId: string) => {
    setOpenTooltipId((prev) => (prev === blockId ? null : blockId))
  }, [])

  const focusRulerLine = useCallback((id: string) => {
    if (rulerLeaveTimerRef.current) {
      clearTimeout(rulerLeaveTimerRef.current)
      rulerLeaveTimerRef.current = null
    }
    setRulerFocusLineId(id)
  }, [])

  const scheduleRulerUnfocus = useCallback(() => {
    if (rulerLeaveTimerRef.current) clearTimeout(rulerLeaveTimerRef.current)
    rulerLeaveTimerRef.current = setTimeout(() => {
      const first = usePuzzleStore.getState().orderingIds[0] ?? null
      setRulerFocusLineId(first)
      rulerLeaveTimerRef.current = null
    }, 220)
  }, [])

  useEffect(
    () => () => {
      if (rulerLeaveTimerRef.current) clearTimeout(rulerLeaveTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    if (orderingIds.length === 0) {
      setRulerFocusLineId(null)
      return
    }
    setRulerFocusLineId((prev) => {
      if (prev != null && orderingIds.includes(prev)) return prev
      return orderingIds[0]
    })
  }, [orderingIds])

  const bumpIndent = useCallback(
    (id: string, delta: number) => {
      focusRulerLine(id)
      const cur = indentById[id] ?? 0
      setIndent(id, Math.max(0, Math.min(MAX_INDENT, cur + delta)))
    },
    [focusRulerLine, indentById, setIndent],
  )

  useEffect(() => {
    if (!openTooltipId) return
    function dismiss(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (
        target.closest(`.${puzzleStyles.infoButton}`)
        || target.closest(`.${puzzleStyles.explanationTooltip}`)
        || target.closest(`.${styles.orderingHelpWrap}`)
      ) {
        return
      }
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
    if (hintCooldownUntil <= now) {
      setHintOnCooldown(false)
      return
    }
    setHintOnCooldown(true)
    const timer = setTimeout(() => setHintOnCooldown(false), hintCooldownUntil - now)
    return () => clearTimeout(timer)
  }, [hintCooldownUntil])

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

  function handleDragStart(event: DragStartEvent) {
    setOpenTooltipId(null)
    const id = String(event.active.id)
    setActiveDragId(id)
    focusRulerLine(id)
    /* useSortable + max-content cards: rect.initial.width is often wrong; measure the real row */
    const block = document.querySelector(`[data-block-id="${id}"]`) as HTMLElement | null
    const row = block?.closest('[data-ordering-row]') as HTMLElement | null
    const articleW = block?.getBoundingClientRect().width
    const rowW = row?.getBoundingClientRect().width
    const fromKit = event.active.rect.current.initial?.width
    if (articleW && rowW && articleW > 8 && rowW > 8) {
      setDragOverlaySize({ row: Math.round(rowW), article: Math.round(articleW) })
    } else if (fromKit && fromKit > 8) {
      const approxArticle = Math.max(80, Math.round(fromKit - 62))
      setDragOverlaySize({ row: Math.round(fromKit), article: approxArticle })
    } else {
      setDragOverlaySize(null)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    setActiveDragId(null)
    setDragOverlaySize(null)
    focusRulerLine(activeId)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderingIds.indexOf(String(active.id))
    const newIndex = orderingIds.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    if (oldIndex !== newIndex) {
      reorderOrdering(oldIndex, newIndex)
    }
  }

  useEffect(() => {
    if (!hintLineId) return
    const el = document.querySelector(`[data-block-id="${hintLineId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [hintLineId])

  if (isLoading) {
    return (
      <section className={styles.loadingWrap}>
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

  const rulerLineId = rulerFocusLineId ?? activeDragId
  const rulerHighlightLevel = rulerLineId != null ? (indentById[rulerLineId] ?? 0) : null

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
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragCancel={(event) => {
          focusRulerLine(String(event.active.id))
          setActiveDragId(null)
          setDragOverlaySize(null)
        }}
        onDragEnd={handleDragEnd}
      >
        <section className={`${styles.board} ${styles.boardOrdering}`}>
          <div className={styles.boardTopRow}>
            <div className={styles.boardHintCol}>
              <p className={styles.boardHint}>
                Drag to reorder compact lines. Indent ticks follow the hovered line (defaults to the first); − / + adjust level.
              </p>
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
            className={`${styles.hintStrip} ${hintMessage ? `${puzzleStyles.hintStripActive} ${styles.hintStripHasMessage}` : styles.hintStripEmpty}`}
            aria-live="polite"
          >
            {hintMessage ? (
              <p className={styles.hintText} onClick={clearHint} role="status">
                {hintMessage}
                <span className={styles.hintDismiss}>dismiss</span>
              </p>
            ) : null}
          </div>

          <div ref={listBodyRef} className={styles.orderingScroll}>
            <header className={styles.orderingLaneHeader}>
              <h3 className={styles.orderingLaneTitle}>Ordered program</h3>
              <p className={styles.orderingLaneSubtitle}>Reorder lines; indent ticks match the hovered line.</p>
            </header>
            <div
              className={`${styles.rulerAlignRow} ${rulerHighlightLevel !== null ? styles.rulerAlignRowLive : ''}`}
              aria-hidden="true"
            >
              <div className={styles.rulerGutterSpacer} />
              <div className={styles.rulerTicksRegion}>
                <div className={puzzleStyles.indentRuler}>
                  {Array.from({ length: MAX_INDENT + 1 }, (_, i) => (
                    <div
                      key={i}
                      className={`${puzzleStyles.indentTick} ${rulerHighlightLevel !== null && i <= rulerHighlightLevel ? puzzleStyles.indentTickActive : ''}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <SortableContext items={orderingIds} strategy={verticalListSortingStrategy}>
              <div className={styles.orderingList}>
                {orderingIds.map((id, orderIndex) => {
                  const line = lineById[id]
                  if (!line) return null
                  const isHintTarget = hintTargetSlot === orderIndex && hintLineId !== null
                  return (
                    <OrderingLineCard
                      key={id}
                      id={id}
                      orderIndex={orderIndex}
                      code={line.code}
                      explanation={line.explanation}
                      language={language}
                      indent={indentById[id] ?? 0}
                      incorrect={incorrectSet.has(id)}
                      isHinted={hintLineId === id}
                      isHintTarget={isHintTarget}
                      isRulerLineFocused={rulerLineId === id}
                      tooltipOpen={openTooltipId === id}
                      onToggleTooltip={toggleTooltip}
                      onIndentDelta={bumpIndent}
                      onRowPointerEnter={focusRulerLine}
                      onRowPointerLeave={scheduleRulerUnfocus}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </div>
        </section>

        <DragOverlay zIndex={2000} dropAnimation={null}>
          {activeLine ? (
            <div
              className={styles.orderingDragOverlayRow}
              style={
                dragOverlaySize
                  ? ({
                      width: `${dragOverlaySize.row}px`,
                      maxWidth: 'min(calc(100vw - 24px), 100%)',
                      ['--ordering-drag-article-px' as string]: `${dragOverlaySize.article}px`,
                    } as CSSProperties)
                  : undefined
              }
            >
              <div className={`${styles.indentGutter} ${styles.orderingDragOverlayGutter}`} aria-hidden>
                <span className={styles.orderingDragGutterFaint}>−</span>
                <span className={styles.orderingDragGutterFaint}>+</span>
              </div>
              <article
                className={`${puzzleStyles.card} ${puzzleStyles.cardDragging} ${puzzleStyles.overlayCard} ${styles.orderingDragOverlayArticle}`}
              >
                <div className={styles.orderingCodeMetaRow}>
                  <div className={`${puzzleStyles.codeContainer} ${styles.orderingCodeWrap}`}>
                    <pre className={`${puzzleStyles.codeText} ${styles.orderingCodeText}`}>
                      <code
                        dangerouslySetInnerHTML={{
                          __html: colorizeCache.get(`${toMonacoLanguage(language)}:${activeLine.code}`) || escapeHtml(activeLine.code),
                        }}
                      />
                    </pre>
                  </div>
                  <div className={styles.orderingHelpWrap} aria-hidden>
                    <button type="button" className={puzzleStyles.infoButton} tabIndex={-1} disabled>
                      ?
                    </button>
                  </div>
                </div>
              </article>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {hintLineId && hintTargetSlot !== null ? (
        <HintArrowOverlay
          fromId={hintLineId}
          targetSlot={hintTargetSlot}
          targetBodyRef={listBodyRef}
          targetIndexAttr="data-order-index"
        />
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
