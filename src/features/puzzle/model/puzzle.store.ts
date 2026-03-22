import { create } from 'zustand'
import { validatePuzzle } from './validatePuzzle'

let gapSeed = 0

function createGapId() {
  gapSeed += 1
  return `gap-${Date.now()}-${gapSeed}`
}

export function isGapId(id: string) {
  return id.startsWith('gap-')
}

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
  incorrectIds: string[]
  isSolved: boolean
  hintMessage: string | null
  hintLineId: string | null
  hintDirection: 'up' | 'down' | 'left' | 'right' | null
  hintTargetSlot: number | null
  hintCooldownUntil: number
  past: PuzzleSnapshot[]
  future: PuzzleSnapshot[]
  error: string | null
  setLines: (lines: PuzzleLine[], language: string) => void
  moveLine: (activeId: string, overContainer: 'source' | 'target', slotIndex?: number) => void
  setIndent: (id: string, indent: number) => void
  checkSolution: () => void
  dismissSolved: () => void
  /** Same puzzle lines, reshuffled bank + empty solution slots (after solve or anytime). */
  playAgain: () => void
  requestHint: () => void
  clearHint: () => void
  undo: () => void
  redo: () => void
  setStarted: (hasStarted: boolean) => void
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
  incorrectIds: [],
  isSolved: false,
  hintMessage: null,
  hintLineId: null,
  hintDirection: null,
  hintTargetSlot: null,
  hintCooldownUntil: 0,
  past: [],
  future: [],
  error: null,
  setLines: (lines, language) => {
    const sourceIds = shuffleIds(lines.map((line) => line.id))
    const targetIds = lines.map(() => createGapId())
    set({
      lines,
      sourceIds,
      targetIds,
      indentById: {},
      language,
      incorrectIds: [],
      isSolved: false,
      hintMessage: null,
      hintLineId: null,
      hintDirection: null,
      hintTargetSlot: null,
      hintCooldownUntil: 0,
      past: [],
      future: [],
      error: null,
    })
  },
  moveLine: (activeId, overContainer, slotIndex) => {
    set((state) => {
      const inSource = state.sourceIds.includes(activeId)
      const activeTargetIdx = state.targetIds.indexOf(activeId)
      const inTarget = activeTargetIdx >= 0

      if (!inSource && !inTarget) return state

      const snapshot = snapshotOf(state)
      const sourceNext = [...state.sourceIds]
      const targetNext = [...state.targetIds]

      if (overContainer === 'source') {
        if (inSource) return state
        targetNext[activeTargetIdx] = createGapId()
        sourceNext.push(activeId)

        return {
          ...state,
          sourceIds: sourceNext,
          targetIds: targetNext,
          incorrectIds: [],
          isSolved: false,
          hintMessage: null,
          hintLineId: null,
          hintDirection: null,
          hintTargetSlot: null,
          past: pushPast(state.past, snapshot),
          future: [],
        }
      }

      if (slotIndex === undefined || slotIndex < 0 || slotIndex >= targetNext.length) return state

      const displaced = targetNext[slotIndex]

      if (inSource) {
        const srcIdx = sourceNext.indexOf(activeId)
        if (srcIdx < 0) return state
        sourceNext.splice(srcIdx, 1)
        targetNext[slotIndex] = activeId
        if (displaced && !isGapId(displaced)) {
          sourceNext.push(displaced)
        }
      } else {
        if (activeTargetIdx === slotIndex) return state
        targetNext[activeTargetIdx] = displaced
        targetNext[slotIndex] = activeId
      }

      return {
        ...state,
        sourceIds: sourceNext,
        targetIds: targetNext,
        incorrectIds: [],
        isSolved: false,
        hintMessage: null,
        hintLineId: null,
        hintDirection: null,
        hintTargetSlot: null,
        past: pushPast(state.past, snapshot),
        future: [],
      }
    })
  },
  setIndent: (id, indent) => {
    set((state) => {
      const nextIndent = Math.max(0, Math.min(8, indent))
      if ((state.indentById[id] ?? 0) === nextIndent) return state

      return {
        ...state,
        incorrectIds: [],
        isSolved: false,
        hintMessage: null,
        hintLineId: null,
        hintDirection: null,
        hintTargetSlot: null,
        past: pushPast(state.past, snapshotOf(state)),
        future: [],
        indentById: { ...state.indentById, [id]: nextIndent },
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
      return { ...state, incorrectIds: result.incorrectIds, isSolved: result.isSolved }
    })
  },
  dismissSolved: () => set({ isSolved: false }),
  playAgain: () => {
    set((state) => {
      if (state.lines.length === 0) return state
      const sourceIds = shuffleIds(state.lines.map((line) => line.id))
      const targetIds = state.lines.map(() => createGapId())
      return {
        ...state,
        sourceIds,
        targetIds,
        indentById: {},
        incorrectIds: [],
        isSolved: false,
        hintMessage: null,
        hintLineId: null,
        hintDirection: null,
        hintTargetSlot: null,
        hintCooldownUntil: 0,
        past: [],
        future: [],
      }
    })
  },
  requestHint: () => {
    set((state) => {
      const now = Date.now()

      if (now < state.hintCooldownUntil) {
        const secondsLeft = Math.max(1, Math.ceil((state.hintCooldownUntil - now) / 1000))
        return { ...state, hintMessage: `Hint cooldown active. Try again in ${secondsLeft}s.` }
      }

      if (state.lines.length === 0) {
        return { ...state, hintMessage: 'Generate a puzzle first to receive hints.', hintLineId: null, hintDirection: null, hintTargetSlot: null }
      }

      const expected = [...state.lines].sort((a, b) => a.targetLine - b.targetLine)
      const placedIds = state.targetIds.filter((id) => !isGapId(id))

      type HintOption = {
        lineId: string
        message: string
        direction: 'up' | 'down' | 'left' | 'right'
        targetSlot: number | null
      }

      /** Wrong slot or still in bank — fix order/placement before indentation */
      const placementHints: HintOption[] = []
      /** Only when every placed line is in the correct slot */
      const indentHints: HintOption[] = []

      for (let slot = 0; slot < state.targetIds.length; slot += 1) {
        const id = state.targetIds[slot]
        if (isGapId(id)) continue

        const placed = state.lines.find((line) => line.id === id)
        if (!placed) continue

        const correctSlot = expected.findIndex((line) => line.id === id)
        if (correctSlot >= 0 && correctSlot !== slot) {
          const dir = correctSlot < slot ? 'up' as const : 'down' as const
          placementHints.push({
            lineId: placed.id,
            message: `Move "${placed.code.trim()}" ${dir} in the solution.`,
            direction: dir,
            targetSlot: correctSlot,
          })
          continue
        }

        const expectedLine = expected[slot]
        if (!expectedLine) continue
        const currentIndent = state.indentById[placed.id] ?? 0
        if (currentIndent !== expectedLine.targetIndent) {
          const indentDir = currentIndent < expectedLine.targetIndent ? 'right' as const : 'left' as const
          const label = indentDir === 'right' ? 'Increase' : 'Decrease'
          indentHints.push({
            lineId: placed.id,
            message: `${label} indentation for "${placed.code.trim()}".`,
            direction: indentDir,
            targetSlot: null,
          })
        }
      }

      for (const line of expected) {
        if (!placedIds.includes(line.id)) {
          const correctSlot = expected.indexOf(line)
          placementHints.push({
            lineId: line.id,
            message: `Drag "${line.code.trim()}" from Code Bank into the solution area.`,
            direction: 'right',
            targetSlot: correctSlot,
          })
        }
      }

      const options = placementHints.length > 0 ? placementHints : indentHints

      if (options.length === 0) {
        return {
          ...state,
          hintMessage: 'Your structure looks correct. Use Check Solution to confirm.',
          hintLineId: null,
          hintDirection: null,
          hintTargetSlot: null,
          hintCooldownUntil: now + 10_000,
        }
      }

      const pick = options[Math.floor(Math.random() * options.length)]
      return {
        ...state,
        hintMessage: pick.message,
        hintLineId: pick.lineId,
        hintDirection: pick.direction,
        hintTargetSlot: pick.targetSlot,
        hintCooldownUntil: now + 10_000,
      }
    })
  },
  clearHint: () => set({ hintMessage: null, hintLineId: null, hintDirection: null, hintTargetSlot: null }),
  undo: () => {
    set((state) => {
      const previous = state.past.at(-1)
      if (!previous) return state
      return {
        ...state,
        sourceIds: previous.sourceIds,
        targetIds: previous.targetIds,
        indentById: previous.indentById,
        incorrectIds: [],
        isSolved: false,
        hintMessage: null,
        hintLineId: null,
        hintDirection: null,
        hintTargetSlot: null,
        past: state.past.slice(0, -1),
        future: [snapshotOf(state), ...state.future],
      }
    })
  },
  redo: () => {
    set((state) => {
      const next = state.future[0]
      if (!next) return state
      return {
        ...state,
        sourceIds: next.sourceIds,
        targetIds: next.targetIds,
        indentById: next.indentById,
        incorrectIds: [],
        isSolved: false,
        hintMessage: null,
        hintLineId: null,
        hintDirection: null,
        hintTargetSlot: null,
        past: pushPast(state.past, snapshotOf(state)),
        future: state.future.slice(1),
      }
    })
  },
  setStarted: (hasStarted) => set({ hasStarted }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
