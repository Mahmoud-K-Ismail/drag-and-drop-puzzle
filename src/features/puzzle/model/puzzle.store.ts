import { create } from 'zustand'
import { arrayMove } from '@dnd-kit/sortable'
import { validatePuzzle } from './validatePuzzle'

export type PuzzleLine = {
  id: string
  code: string
  explanation: string
  targetLine: number
  targetIndent: number
}

type PuzzleSnapshot = {
  sourceIds: string[]
  targetIds: string[]
  indentById: Record<string, number>
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
  incorrectIds: string[]
  isSolved: boolean
  hintMessage: string | null
  hintCooldownUntil: number
  past: PuzzleSnapshot[]
  future: PuzzleSnapshot[]
  error: string | null
  setLines: (lines: PuzzleLine[], language: string) => void
  setLineExplanations: (items: Array<{ id: string; explanation: string }>) => void
  moveLine: (activeId: string, overId: string | null, overContainer: 'source' | 'target') => void
  setIndent: (id: string, indent: number) => void
  checkSolution: () => void
  dismissSolved: () => void
  requestHint: () => void
  undo: () => void
  redo: () => void
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

function snapshotOf(state: Pick<PuzzleState, 'sourceIds' | 'targetIds' | 'indentById'>): PuzzleSnapshot {
  return {
    sourceIds: [...state.sourceIds],
    targetIds: [...state.targetIds],
    indentById: { ...state.indentById },
  }
}

function pushPast(past: PuzzleSnapshot[], entry: PuzzleSnapshot) {
  const next = [...past, entry]

  return next.length > 100 ? next.slice(next.length - 100) : next
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
  incorrectIds: [],
  isSolved: false,
  hintMessage: null,
  hintCooldownUntil: 0,
  past: [],
  future: [],
  error: null,
  setLines: (lines, language) => {
    const sourceIds = shuffleIds(lines.map((line) => line.id))
    const indentById = Object.fromEntries(lines.map((line) => [line.id, 0]))
    set({
      lines,
      sourceIds,
      targetIds: [],
      indentById,
      language,
      incorrectIds: [],
      isSolved: false,
      hintMessage: null,
      hintCooldownUntil: 0,
      past: [],
      future: [],
      error: null,
    })
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
        if (overId === activeId) {
          return state
        }

        let reordered: string[]

        if (!overId) {
          reordered = [...fromList]
          reordered.splice(activeIndex, 1)
          reordered.push(activeId)
        } else {
          const overIndex = fromList.indexOf(overId)

          if (overIndex < 0) {
            return state
          }

          reordered = arrayMove(fromList, activeIndex, overIndex)
        }

        if (reordered.join('|') === fromList.join('|')) {
          return state
        }

        return activeContainer === 'source'
          ? {
              ...state,
              sourceIds: reordered,
              incorrectIds: [],
              isSolved: false,
              hintMessage: null,
              past: pushPast(state.past, snapshotOf(state)),
              future: [],
            }
          : {
              ...state,
              targetIds: reordered,
              incorrectIds: [],
              isSolved: false,
              hintMessage: null,
              past: pushPast(state.past, snapshotOf(state)),
              future: [],
            }
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
        incorrectIds: [],
        isSolved: false,
        hintMessage: null,
        past: pushPast(state.past, snapshotOf(state)),
        future: [],
        sourceIds: activeContainer === 'source' ? fromNext : toNext,
        targetIds: activeContainer === 'source' ? toNext : fromNext,
      }
    })
  },
  setIndent: (id, indent) => {
    set((state) => {
      const nextIndent = Math.max(0, Math.min(8, indent))

      if ((state.indentById[id] ?? 0) === nextIndent) {
        return state
      }

      return {
        ...state,
        incorrectIds: [],
        isSolved: false,
        hintMessage: null,
        past: pushPast(state.past, snapshotOf(state)),
        future: [],
        indentById: {
          ...state.indentById,
          [id]: nextIndent,
        },
      }
    })
  },
  checkSolution: () => {
    set((state) => {
      const result = validatePuzzle({
        lines: state.lines,
        targetIds: state.targetIds,
        sourceIds: state.sourceIds,
        indentById: state.indentById,
      })

      return {
        ...state,
        incorrectIds: result.incorrectIds,
        isSolved: result.isSolved,
      }
    })
  },
  dismissSolved: () => set({ isSolved: false }),
  requestHint: () => {
    set((state) => {
      const now = Date.now()

      if (now < state.hintCooldownUntil) {
        const secondsLeft = Math.max(1, Math.ceil((state.hintCooldownUntil - now) / 1000))
        return {
          ...state,
          hintMessage: `Hint cooldown active. Try again in ${secondsLeft}s.`,
        }
      }

      if (state.lines.length === 0) {
        return {
          ...state,
          hintMessage: 'Generate a puzzle first to receive hints.',
        }
      }

      const expected = [...state.lines].sort((a, b) => a.targetLine - b.targetLine)

      for (let index = 0; index < state.targetIds.length; index += 1) {
        const placedId = state.targetIds[index]
        const placed = state.lines.find((line) => line.id === placedId)
        const expectedLine = expected[index]

        if (!placed || !expectedLine) {
          continue
        }

        if (placed.id !== expectedLine.id) {
          const expectedIndex = expected.findIndex((line) => line.id === placed.id)

          if (expectedIndex >= 0) {
            const direction = expectedIndex < index ? 'up' : 'down'
            return {
              ...state,
              hintMessage: `Move \"${placed.code.trim()}\" ${direction} in the solution order.`,
              hintCooldownUntil: now + 10_000,
            }
          }
        }

        const currentIndent = state.indentById[placed.id] ?? 0
        if (currentIndent !== expectedLine.targetIndent) {
          const direction = currentIndent < expectedLine.targetIndent ? 'increase' : 'decrease'
          return {
            ...state,
            hintMessage: `${direction === 'increase' ? 'Increase' : 'Decrease'} indentation for \"${placed.code.trim()}\".`,
            hintCooldownUntil: now + 10_000,
          }
        }
      }

      const missing = expected.find((line) => !state.targetIds.includes(line.id))

      if (missing) {
        return {
          ...state,
          hintMessage: `Drag \"${missing.code.trim()}\" from Code Bank into the solution area.`,
          hintCooldownUntil: now + 10_000,
        }
      }

      return {
        ...state,
        hintMessage: 'Your structure looks correct. Use Check Solution to confirm.',
        hintCooldownUntil: now + 10_000,
      }
    })
  },
  undo: () => {
    set((state) => {
      const previous = state.past.at(-1)

      if (!previous) {
        return state
      }

      return {
        ...state,
        sourceIds: previous.sourceIds,
        targetIds: previous.targetIds,
        indentById: previous.indentById,
        incorrectIds: [],
        isSolved: false,
        hintMessage: null,
        past: state.past.slice(0, -1),
        future: [snapshotOf(state), ...state.future],
      }
    })
  },
  redo: () => {
    set((state) => {
      const next = state.future[0]

      if (!next) {
        return state
      }

      return {
        ...state,
        sourceIds: next.sourceIds,
        targetIds: next.targetIds,
        indentById: next.indentById,
        incorrectIds: [],
        isSolved: false,
        hintMessage: null,
        past: pushPast(state.past, snapshotOf(state)),
        future: state.future.slice(1),
      }
    })
  },
  setStarted: (hasStarted) => set({ hasStarted }),
  setLoading: (isLoading) => set({ isLoading }),
  setExplaining: (isExplaining) => set({ isExplaining }),
  setError: (error) => set({ error }),
}))
