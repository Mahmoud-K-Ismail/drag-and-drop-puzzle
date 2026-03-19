import { create } from 'zustand'
import { arrayMove } from '@dnd-kit/sortable'

export type PuzzleLine = {
  id: string
  code: string
  explanation: string
  targetLine: number
  targetIndent: number
}

type PuzzleState = {
  language: string
  lines: PuzzleLine[]
  sourceIds: string[]
  targetIds: string[]
  indentById: Record<string, number>
  hasStarted: boolean
  isLoading: boolean
  isExplaining: boolean
  error: string | null
  setLines: (lines: PuzzleLine[], language: string) => void
  setLineExplanations: (items: Array<{ id: string; explanation: string }>) => void
  moveLine: (activeId: string, overId: string | null, overContainer: 'source' | 'target') => void
  setIndent: (id: string, indent: number) => void
  setStarted: (hasStarted: boolean) => void
  setLoading: (isLoading: boolean) => void
  setExplaining: (isExplaining: boolean) => void
  setError: (error: string | null) => void
}

function shuffleIds(ids: string[]) {
  const items = [...ids]

  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[items[index], items[randomIndex]] = [items[randomIndex], items[index]]
  }

  return items
}

export const usePuzzleStore = create<PuzzleState>((set) => ({
  language: 'javascript',
  lines: [],
  sourceIds: [],
  targetIds: [],
  indentById: {},
  hasStarted: false,
  isLoading: false,
  isExplaining: false,
  error: null,
  setLines: (lines, language) => {
    const sourceIds = shuffleIds(lines.map((line) => line.id))
    const indentById = Object.fromEntries(lines.map((line) => [line.id, 0]))
    set({ lines, sourceIds, targetIds: [], indentById, language, error: null })
  },
  setLineExplanations: (items) => {
    set((state) => {
      const byId = new Map(items.map((item) => [item.id, item.explanation]))

      return {
        ...state,
        lines: state.lines.map((line) => ({
          ...line,
          explanation: byId.get(line.id) ?? line.explanation,
        })),
      }
    })
  },
  moveLine: (activeId, overId, overContainer) => {
    set((state) => {
      const inSource = state.sourceIds.includes(activeId)
      const activeContainer = inSource ? 'source' : 'target'

      if (!inSource && !state.targetIds.includes(activeId)) {
        return state
      }

      const fromList = activeContainer === 'source' ? state.sourceIds : state.targetIds
      const toList = overContainer === 'source' ? state.sourceIds : state.targetIds
      const activeIndex = fromList.indexOf(activeId)

      if (activeIndex < 0) {
        return state
      }

      if (activeContainer === overContainer) {
        if (!overId || overId === activeId) {
          return state
        }

        const overIndex = fromList.indexOf(overId)

        if (overIndex < 0) {
          return state
        }

        const reordered = arrayMove(fromList, activeIndex, overIndex)

        return activeContainer === 'source'
          ? { ...state, sourceIds: reordered }
          : { ...state, targetIds: reordered }
      }

      const fromNext = [...fromList]
      fromNext.splice(activeIndex, 1)

      const toNext = [...toList]
      const overIndex = overId ? toList.indexOf(overId) : -1

      if (overIndex >= 0) {
        toNext.splice(overIndex, 0, activeId)
      } else {
        toNext.push(activeId)
      }

      return {
        ...state,
        sourceIds: activeContainer === 'source' ? fromNext : toNext,
        targetIds: activeContainer === 'source' ? toNext : fromNext,
      }
    })
  },
  setIndent: (id, indent) => {
    set((state) => ({
      ...state,
      indentById: {
        ...state.indentById,
        [id]: Math.max(0, Math.min(8, indent)),
      },
    }))
  },
  setStarted: (hasStarted) => set({ hasStarted }),
  setLoading: (isLoading) => set({ isLoading }),
  setExplaining: (isExplaining) => set({ isExplaining }),
  setError: (error) => set({ error }),
}))
