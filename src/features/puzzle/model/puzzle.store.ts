import { create } from 'zustand'

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
  orderedIds: string[]
  indentById: Record<string, number>
  isLoading: boolean
  error: string | null
  setLines: (lines: PuzzleLine[], language: string) => void
  reorderLines: (activeId: string, overId: string) => void
  setIndent: (id: string, indent: number) => void
  setLoading: (isLoading: boolean) => void
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
  orderedIds: [],
  indentById: {},
  isLoading: false,
  error: null,
  setLines: (lines, language) => {
    const orderedIds = shuffleIds(lines.map((line) => line.id))
    const indentById = Object.fromEntries(lines.map((line) => [line.id, 0]))
    set({ lines, orderedIds, indentById, language, error: null })
  },
  reorderLines: (activeId, overId) => {
    if (activeId === overId) {
      return
    }

    set((state) => {
      const activeIndex = state.orderedIds.indexOf(activeId)
      const overIndex = state.orderedIds.indexOf(overId)

      if (activeIndex < 0 || overIndex < 0) {
        return state
      }

      const next = [...state.orderedIds]
      const [moved] = next.splice(activeIndex, 1)
      next.splice(overIndex, 0, moved)

      return {
        ...state,
        orderedIds: next,
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
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
