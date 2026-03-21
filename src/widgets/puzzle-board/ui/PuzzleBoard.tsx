import { useEffect, useState, type ReactNode } from 'react'
import Editor from '@monaco-editor/react'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDroppable,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePuzzleStore } from '../../../features/puzzle/model/puzzle.store'
import styles from './PuzzleBoard.module.css'

const INDENT_STEP = 24

function toMonacoLanguage(language: string) {
  switch (language.toLowerCase()) {
    case 'cpp':
      return 'cpp'
    case 'c++':
      return 'cpp'
    default:
      return language.toLowerCase()
  }
}

function SortableBlock({
  id,
  code,
  explanation,
  indent,
  language,
  container,
  incorrect,
}: {
  id: string
  code: string
  explanation: string
  indent: number
  language: string
  container: 'source' | 'target'
  incorrect: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data: { container } })
  const [showExplanation, setShowExplanation] = useState(false)

  const visualRows = code
    .split('\n')
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 64)), 0)
  const lineHeight = 21
  const editorHeight = Math.min(96, Math.max(24, visualRows * lineHeight + 2))

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: container === 'target' ? `${indent * INDENT_STEP}px` : '0px',
    width: container === 'target' ? `calc(100% - ${indent * INDENT_STEP}px)` : '100%',
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''} ${incorrect ? styles.cardIncorrect : ''}`}
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
        <Editor
          height={`${editorHeight}px`}
          language={language}
          value={code}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            lineNumbers: 'off',
            glyphMargin: false,
            folding: false,
            scrollBeyondLastLine: false,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: 'hidden',
              horizontal: 'auto',
            },
            padding: {
              top: 0,
              bottom: 0,
            },
            wordWrap: 'on',
            fontSize: 15,
            lineHeight,
          }}
        />
      </div>
    </article>
  )
}

function Lane({
  laneId,
  title,
  subtitle,
  children,
}: {
  laneId: 'source' | 'target'
  title: string
  subtitle: string
  children: ReactNode
}) {
  const { setNodeRef } = useDroppable({ id: laneId })

  return (
    <section ref={setNodeRef} className={styles.lane} data-lane={laneId}>
      <header className={styles.laneHeader}>
        <h3 className={styles.laneTitle}>{title}</h3>
        <p className={styles.laneSubtitle}>{subtitle}</p>
      </header>
      <div className={styles.laneBody}>{children}</div>
    </section>
  )
}

export function PuzzleBoard() {
  const lines = usePuzzleStore((state) => state.lines)
  const isLoading = usePuzzleStore((state) => state.isLoading)
  const isExplaining = usePuzzleStore((state) => state.isExplaining)
  const language = usePuzzleStore((state) => state.language)
  const sourceIds = usePuzzleStore((state) => state.sourceIds)
  const targetIds = usePuzzleStore((state) => state.targetIds)
  const indentById = usePuzzleStore((state) => state.indentById)
  const incorrectIds = usePuzzleStore((state) => state.incorrectIds)
  const isSolved = usePuzzleStore((state) => state.isSolved)
  const hintMessage = usePuzzleStore((state) => state.hintMessage)
  const pastCount = usePuzzleStore((state) => state.past.length)
  const futureCount = usePuzzleStore((state) => state.future.length)
  const moveLine = usePuzzleStore((state) => state.moveLine)
  const setIndent = usePuzzleStore((state) => state.setIndent)
  const checkSolution = usePuzzleStore((state) => state.checkSolution)
  const dismissSolved = usePuzzleStore((state) => state.dismissSolved)
  const requestHint = usePuzzleStore((state) => state.requestHint)
  const undo = usePuzzleStore((state) => state.undo)
  const redo = usePuzzleStore((state) => state.redo)

  const sensors = useSensors(useSensor(PointerSensor))

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null

    if (!overId) {
      return
    }

    const activeContainer = sourceIds.includes(activeId) ? 'source' : 'target'
    const overContainer: 'source' | 'target' =
      overId === 'source' || overId === 'target'
        ? overId
        : sourceIds.includes(overId)
          ? 'source'
          : 'target'

    moveLine(activeId, overId === 'source' || overId === 'target' ? null : overId, overContainer)

    if (activeContainer === 'target' || overContainer === 'target') {
      const currentIndent = indentById[activeId] ?? 0
      const nextIndent = currentIndent + Math.round(event.delta.x / INDENT_STEP)
      setIndent(activeId, nextIndent)
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMeta = event.metaKey || event.ctrlKey

      if (!isMeta) {
        return
      }

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
  const monacoLanguage = toMonacoLanguage(language)
  const incorrectSet = new Set(incorrectIds)

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <section className={styles.board}>
          <div className={styles.boardTopRow}>
            <div>
              <p className={styles.boardHint}>Drag blocks from left to right, then fine-tune indentation in the solution area.</p>
              {isExplaining ? <p className={styles.boardHintSecondary}>Generating line explanations in the background...</p> : null}
            </div>
            <div className={styles.controlsRow}>
              <button className={`${styles.ghostButton} ${styles.undoButton}`} type="button" onClick={undo} disabled={pastCount === 0}>
                Undo
              </button>
              <button className={`${styles.ghostButton} ${styles.redoButton}`} type="button" onClick={redo} disabled={futureCount === 0}>
                Redo
              </button>
              <button className={`${styles.ghostButton} ${styles.hintButton}`} type="button" onClick={requestHint}>
                Hint
              </button>
              <button className={styles.checkButton} type="button" onClick={checkSolution}>
                Check Solution
              </button>
            </div>
          </div>
          {hintMessage ? <p className={styles.hintText}>{hintMessage}</p> : null}

          <div className={styles.lanesGrid}>
            <SortableContext items={sourceIds} strategy={verticalListSortingStrategy}>
              <Lane laneId="source" title="Code Bank" subtitle="Unplaced lines">
                {sourceIds.length === 0 ? <p className={styles.emptyLane}>All lines are moved to the solution.</p> : null}
                {sourceIds.map((id) => {
                  const line = lineById[id]

                  if (!line) {
                    return null
                  }

                  return (
                    <SortableBlock
                      key={line.id}
                      id={line.id}
                      code={line.code}
                      explanation={line.explanation}
                      indent={0}
                      language={monacoLanguage}
                      container="source"
                      incorrect={false}
                    />
                  )
                })}
              </Lane>
            </SortableContext>

            <SortableContext items={targetIds} strategy={verticalListSortingStrategy}>
              <Lane laneId="target" title="Solution Area" subtitle="Drop and arrange lines here">
                {targetIds.length === 0 ? <p className={styles.emptyLane}>Drop code lines here to build your answer.</p> : null}
                {targetIds.map((id) => {
                  const line = lineById[id]

                  if (!line) {
                    return null
                  }

                  return (
                    <SortableBlock
                      key={line.id}
                      id={line.id}
                      code={line.code}
                      explanation={line.explanation}
                      indent={indentById[line.id] ?? 0}
                      language={monacoLanguage}
                      container="target"
                      incorrect={incorrectSet.has(line.id)}
                    />
                  )
                })}
              </Lane>
            </SortableContext>
          </div>
        </section>
      </DndContext>

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
