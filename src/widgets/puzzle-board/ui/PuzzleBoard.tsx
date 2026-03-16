import Editor from '@monaco-editor/react'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
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

function SortableBlock({ id, code, indent }: { id: string; code: string; indent: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${indent * INDENT_STEP}px`,
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <article ref={setNodeRef} style={style} className={styles.card} {...attributes} {...listeners}>
      <Editor
        height="56px"
        defaultLanguage="javascript"
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
            horizontal: 'hidden',
          },
        }}
      />
    </article>
  )
}

export function PuzzleBoard() {
  const lines = usePuzzleStore((state) => state.lines)
  const orderedIds = usePuzzleStore((state) => state.orderedIds)
  const indentById = usePuzzleStore((state) => state.indentById)
  const reorderLines = usePuzzleStore((state) => state.reorderLines)
  const setIndent = usePuzzleStore((state) => state.setIndent)

  const sensors = useSensors(useSensor(PointerSensor))

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : ''

    if (overId.length > 0) {
      reorderLines(activeId, overId)
    }

    const currentIndent = indentById[activeId] ?? 0
    const nextIndent = currentIndent + Math.round(event.delta.x / INDENT_STEP)
    setIndent(activeId, nextIndent)
  }

  if (lines.length === 0) {
    return <div className={styles.empty}>Generated code blocks will appear here.</div>
  }

  const lineById = Object.fromEntries(lines.map((line) => [line.id, line]))

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
        <section className={styles.board}>
          {orderedIds.map((id) => {
            const line = lineById[id]

            if (!line) {
              return null
            }

            return (
              <SortableBlock
                key={line.id}
                id={line.id}
                code={line.code}
                indent={indentById[line.id] ?? 0}
              />
            )
          })}
        </section>
      </SortableContext>
    </DndContext>
  )
}
