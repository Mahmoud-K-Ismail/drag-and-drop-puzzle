import { useCallback, useEffect, useRef, useState } from 'react'
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
  tooltipOpen,
  onToggleTooltip,
  onIndentDelta,
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
  tooltipOpen: boolean
  onToggleTooltip: (id: string) => void
  onIndentDelta: (id: string, delta: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const highlightedCode = useMonacoColorize(code, language)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${indent * 24}px`,
    width: `calc(100% - ${indent * 24}px)`,
    opacity: isDragging ? 0.35 : 1,
  }

  const curIndent = indent

  return (
    <div
      className={`${styles.orderingRow} ${isHintTarget ? styles.orderingRowHintTarget : ''}`}
      data-order-index={orderIndex}
    >
      <article
        ref={setNodeRef}
        style={style}
        data-block-id={id}
        className={`${puzzleStyles.card} ${isDragging ? puzzleStyles.cardDragging : ''} ${incorrect ? puzzleStyles.cardIncorrect : ''} ${isHinted ? puzzleStyles.cardHinted : ''}`}
        {...attributes}
        {...listeners}
      >
        <div className={styles.indentControls}>
          <button
            type="button"
            className={styles.indentBtn}
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
            className={styles.indentBtn}
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
        <div className={`${puzzleStyles.blockActions} ${tooltipOpen ? puzzleStyles.blockActionsActive : ''}`}>
          <button
            className={puzzleStyles.infoButton}
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
              className={puzzleStyles.explanationTooltip}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {explanation || 'No explanation.'}
            </div>
          ) : null}
        </div>
        <div className={puzzleStyles.codeContainer}>
          <pre className={puzzleStyles.codeText}>
            <code dangerouslySetInnerHTML={{ __html: highlightedCode || escapeHtml(code) }} />
          </pre>
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
  const [activeDragWidth, setActiveDragWidth] = useState<number | null>(null)
  const [hintOnCooldown, setHintOnCooldown] = useState(false)
  const [hintCooldownTick, setHintCooldownTick] = useState(0)
  const listBodyRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const toggleTooltip = useCallback((blockId: string) => {
    setOpenTooltipId((prev) => (prev === blockId ? null : blockId))
  }, [])

  const bumpIndent = useCallback(
    (id: string, delta: number) => {
      const cur = indentById[id] ?? 0
      setIndent(id, Math.max(0, Math.min(MAX_INDENT, cur + delta)))
    },
    [indentById, setIndent],
  )

  useEffect(() => {
    if (!openTooltipId) return
    function dismiss(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.closest(`.${puzzleStyles.infoButton}`) || target.closest(`.${puzzleStyles.explanationTooltip}`)) return
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
    setActiveDragId(String(event.active.id))
    setActiveDragWidth(event.active.rect.current.initial?.width ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    setActiveDragWidth(null)
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
        onDragCancel={() => {
          setActiveDragId(null)
          setActiveDragWidth(null)
        }}
        onDragEnd={handleDragEnd}
      >
        <section className={styles.board}>
          <div className={styles.boardTopRow}>
            <div>
              <p className={styles.boardHint}>
                Drag lines to match execution order. Use − / + to adjust indentation.
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

          <div className={`${styles.hintStrip} ${hintMessage ? puzzleStyles.hintStripActive : ''}`} aria-live="polite">
            {hintMessage ? (
              <p className={styles.hintText} onClick={clearHint} role="status">
                {hintMessage}
                <span className={styles.hintDismiss}>dismiss</span>
              </p>
            ) : (
              <div className={styles.hintStripPlaceholder} aria-hidden />
            )}
          </div>

          <div ref={listBodyRef} className={styles.orderingScroll}>
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
                      tooltipOpen={openTooltipId === id}
                      onToggleTooltip={toggleTooltip}
                      onIndentDelta={bumpIndent}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </div>
        </section>

        <DragOverlay zIndex={2000} dropAnimation={null}>
          {activeLine ? (
            <article
              className={`${puzzleStyles.card} ${puzzleStyles.cardDragging} ${puzzleStyles.overlayCard}`}
              style={{ width: activeDragWidth ? `${activeDragWidth}px` : undefined }}
            >
              <div className={puzzleStyles.codeContainer}>
                <pre className={puzzleStyles.codeText}>
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
