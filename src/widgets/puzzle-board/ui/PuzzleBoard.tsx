import { useState, type ReactNode } from 'react'
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
}: {
  id: string
  code: string
  explanation: string
  indent: number
  language: string
  container: 'source' | 'target'
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data: { container } })
  const [showExplanation, setShowExplanation] = useState(false)

  const visualRows = Math.max(1, Math.ceil(code.length / 58))
  const editorHeight = Math.min(126, 26 + visualRows * 22)

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
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''}`}
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
            wordWrap: 'on',
            fontSize: 15,
            lineHeight: 22,
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
    <section ref={setNodeRef} className={styles.lane}>
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
  const moveLine = usePuzzleStore((state) => state.moveLine)
  const setIndent = usePuzzleStore((state) => state.setIndent)

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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <section className={styles.board}>
        <p className={styles.boardHint}>Drag blocks from left to right, then fine-tune indentation in the solution area.</p>
        {isExplaining ? <p className={styles.boardHintSecondary}>Generating line explanations in the background...</p> : null}

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
                  />
                )
              })}
            </Lane>
          </SortableContext>
        </div>
      </section>
    </DndContext>
  )
}
