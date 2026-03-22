import { create } from 'zustand'
import { devLog } from '../../../shared/lib/devLog'
import { normalizePuzzleLineCode } from '../../../shared/lib/puzzleLineCode'
import { validatePuzzle, type PuzzleLayoutMode } from './validatePuzzle'

export type { PuzzleLayoutMode }

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
  orderingIds: string[]
  indentById: Record<string, number>
}

type PuzzleState = {
  language: string
  lines: PuzzleLine[]
  layoutMode: PuzzleLayoutMode
  sourceIds: string[]
  targetIds: string[]
  /** Single-column order when layoutMode === 'ordering' */
  orderingIds: string[]
  indentById: Record<string, number>
  hasStarted: boolean
  isLoading: boolean
  incorrectIds: string[]
  isSolved: boolean
  /** Non-hint feedback after Check (e.g. incomplete puzzle); cleared with hints / moves */
  checkFeedbackMessage: string | null
  hintMessage: string | null
  hintLineId: string | null
  hintDirection: 'up' | 'down' | 'left' | 'right' | null
  hintTargetSlot: number | null
  hintCooldownUntil: number
  past: PuzzleSnapshot[]
  future: PuzzleSnapshot[]
  error: string | null
  setLines: (lines: PuzzleLine[], language: string, layoutMode?: PuzzleLayoutMode) => void
  moveLine: (activeId: string, overContainer: 'source' | 'target', slotIndex?: number) => void
  reorderOrdering: (fromIndex: number, toIndex: number) => void
  setIndent: (id: string, indent: number) => void
  checkSolution: () => void
  dismissSolved: () => void
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

function snapshotOf(
  state: Pick<PuzzleState, 'sourceIds' | 'targetIds' | 'orderingIds' | 'indentById'>,
): PuzzleSnapshot {
  return {
    sourceIds: [...state.sourceIds],
    targetIds: [...state.targetIds],
    orderingIds: [...state.orderingIds],
    indentById: { ...state.indentById },
  }
}

function pushPast(past: PuzzleSnapshot[], entry: PuzzleSnapshot) {
  const next = [...past, entry]
  return next.length > 100 ? next.slice(next.length - 100) : next
}

function clearHintState() {
  return {
    hintMessage: null,
    hintLineId: null,
    hintDirection: null,
    hintTargetSlot: null,
    checkFeedbackMessage: null,
  } as const
}

export const usePuzzleStore = create<PuzzleState>((set) => ({
  language: 'javascript',
  lines: [],
  layoutMode: 'puzzle',
  sourceIds: [],
  targetIds: [],
  orderingIds: [],
  indentById: {},
  hasStarted: false,
  isLoading: false,
  incorrectIds: [],
  isSolved: false,
  checkFeedbackMessage: null,
  hintMessage: null,
  hintLineId: null,
  hintDirection: null,
  hintTargetSlot: null,
  hintCooldownUntil: 0,
  past: [],
  future: [],
  error: null,
  setLines: (lines, language, layoutModeArg = 'puzzle') => {
    const normalizedLines = normalizePuzzleLineCode(lines)

    devLog('puzzle', 'setLines', {
      lineCount: normalizedLines.length,
      language,
      layoutMode: layoutModeArg,
    })

    if (layoutModeArg === 'ordering') {
      set({
        lines: normalizedLines,
        language,
        layoutMode: 'ordering',
        orderingIds: shuffleIds(lines.map((line) => line.id)),
        sourceIds: [],
        targetIds: [],
        indentById: {},
        incorrectIds: [],
        isSolved: false,
        ...clearHintState(),
        hintCooldownUntil: 0,
        past: [],
        future: [],
        error: null,
      })
      return
    }

    const sourceIds = shuffleIds(normalizedLines.map((line) => line.id))
    const targetIds = normalizedLines.map(() => createGapId())
    set({
      lines: normalizedLines,
      language,
      layoutMode: 'puzzle',
      orderingIds: [],
      sourceIds,
      targetIds,
      indentById: {},
      incorrectIds: [],
      isSolved: false,
      ...clearHintState(),
      hintCooldownUntil: 0,
      past: [],
      future: [],
      error: null,
    })
  },
  moveLine: (activeId, overContainer, slotIndex) => {
    set((state) => {
      if (state.layoutMode === 'ordering') return state

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
          ...clearHintState(),
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
        ...clearHintState(),
        past: pushPast(state.past, snapshot),
        future: [],
      }
    })
  },
  reorderOrdering: (fromIndex, toIndex) => {
    set((state) => {
      if (state.layoutMode !== 'ordering') return state
      if (fromIndex === toIndex) return state
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= state.orderingIds.length || toIndex >= state.orderingIds.length) {
        return state
      }
      const next = [...state.orderingIds]
      const [removed] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, removed)
      return {
        ...state,
        orderingIds: next,
        incorrectIds: [],
        isSolved: false,
        ...clearHintState(),
        past: pushPast(state.past, snapshotOf(state)),
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
        ...clearHintState(),
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
        layoutMode: state.layoutMode,
        orderingIds: state.orderingIds,
      })
      devLog('puzzle', 'checkSolution', {
        isSolved: result.isSolved,
        incorrectCount: result.incorrectIds.length,
        layoutMode: state.layoutMode,
        incompleteFeedback: Boolean(result.checkFeedback),
      })
      return {
        ...state,
        incorrectIds: result.incorrectIds,
        isSolved: result.isSolved,
        checkFeedbackMessage: result.isSolved ? null : (result.checkFeedback ?? null),
      }
    })
  },
  dismissSolved: () => set({ isSolved: false }),
  playAgain: () => {
    set((state) => {
      if (state.lines.length === 0) return state
      if (state.layoutMode === 'ordering') {
        return {
          ...state,
          orderingIds: shuffleIds(state.lines.map((line) => line.id)),
          indentById: {},
          incorrectIds: [],
          isSolved: false,
          ...clearHintState(),
          hintCooldownUntil: 0,
          past: [],
          future: [],
        }
      }
      const sourceIds = shuffleIds(state.lines.map((line) => line.id))
      const targetIds = state.lines.map(() => createGapId())
      return {
        ...state,
        sourceIds,
        targetIds,
        indentById: {},
        incorrectIds: [],
        isSolved: false,
        ...clearHintState(),
        hintCooldownUntil: 0,
        past: [],
        future: [],
      }
    })
  },
  requestHint: () => {
    set((state) => {
      const now = Date.now()

      devLog('puzzle', 'requestHint', {
        lineCount: state.lines.length,
        layoutMode: state.layoutMode,
        onCooldown: now < state.hintCooldownUntil,
      })

      if (now < state.hintCooldownUntil) {
        const secondsLeft = Math.max(1, Math.ceil((state.hintCooldownUntil - now) / 1000))
        devLog('puzzle', 'hint skipped (cooldown)', { secondsLeft })
        return {
          ...state,
          checkFeedbackMessage: null,
          hintMessage: `Hint cooldown active. Try again in ${secondsLeft}s.`,
        }
      }

      if (state.lines.length === 0) {
        devLog('puzzle', 'hint skipped (no puzzle)')
        return { ...state, ...clearHintState(), hintMessage: 'Generate a puzzle first to receive hints.' }
      }

      type HintOption = {
        lineId: string
        message: string
        direction: 'up' | 'down' | 'left' | 'right'
        targetSlot: number | null
      }

      const expected = [...state.lines].sort((a, b) => a.targetLine - b.targetLine)

      if (state.layoutMode === 'ordering') {
        const ord = state.orderingIds
        if (ord.length !== expected.length) {
          return { ...state, ...clearHintState(), hintMessage: 'Ordering list is incomplete.' }
        }

        const placementHints: HintOption[] = []
        const indentHints: HintOption[] = []

        for (let i = 0; i < ord.length; i += 1) {
          const id = ord[i]
          const placed = state.lines.find((line) => line.id === id)
          if (!placed) continue

          if (expected[i].id !== id) {
            const correctIdx = expected.findIndex((line) => line.id === id)
            if (correctIdx >= 0 && correctIdx !== i) {
              const dir = correctIdx < i ? 'up' as const : 'down' as const
              placementHints.push({
                lineId: id,
                message: `Move "${placed.code.trim()}" ${dir} in the list.`,
                direction: dir,
                targetSlot: correctIdx,
              })
            }
          }
        }

        if (placementHints.length === 0) {
          for (let i = 0; i < ord.length; i += 1) {
            const id = ord[i]
            const expectedLine = expected[i]
            if (!expectedLine || id !== expectedLine.id) continue
            const currentIndent = state.indentById[id] ?? 0
            if (currentIndent !== expectedLine.targetIndent) {
              const indentDir = currentIndent < expectedLine.targetIndent ? 'right' as const : 'left' as const
              const label = indentDir === 'right' ? 'Increase' : 'Decrease'
              indentHints.push({
                lineId: id,
                message: `${label} indentation for "${expectedLine.code.trim()}".`,
                direction: indentDir,
                targetSlot: null,
              })
            }
          }
        }

        const options = placementHints.length > 0 ? placementHints : indentHints

        if (options.length === 0) {
          return {
            ...state,
            ...clearHintState(),
            hintMessage: 'Your structure looks correct. Use Check Solution to confirm.',
            hintCooldownUntil: now + 10_000,
          }
        }

        const pick = options[Math.floor(Math.random() * options.length)]
        return {
          ...state,
          ...clearHintState(),
          hintMessage: pick.message,
          hintLineId: pick.lineId,
          hintDirection: pick.direction,
          hintTargetSlot: pick.targetSlot,
          hintCooldownUntil: now + 10_000,
        }
      }

      const placedIds = state.targetIds.filter((id) => !isGapId(id))

      const placementHints: HintOption[] = []
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
          ...clearHintState(),
          hintMessage: 'Your structure looks correct. Use Check Solution to confirm.',
          hintCooldownUntil: now + 10_000,
        }
      }

      const pick = options[Math.floor(Math.random() * options.length)]
      return {
        ...state,
        ...clearHintState(),
        hintMessage: pick.message,
        hintLineId: pick.lineId,
        hintDirection: pick.direction,
        hintTargetSlot: pick.targetSlot,
        hintCooldownUntil: now + 10_000,
      }
    })
  },
  clearHint: () => set(clearHintState()),
  undo: () => {
    set((state) => {
      const previous = state.past.at(-1)
      if (!previous) return state
      return {
        ...state,
        sourceIds: previous.sourceIds,
        targetIds: previous.targetIds,
        orderingIds: previous.orderingIds,
        indentById: previous.indentById,
        incorrectIds: [],
        isSolved: false,
        ...clearHintState(),
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
        orderingIds: next.orderingIds,
        indentById: next.indentById,
        incorrectIds: [],
        isSolved: false,
        ...clearHintState(),
        past: pushPast(state.past, snapshotOf(state)),
        future: state.future.slice(1),
      }
    })
  },
  setStarted: (hasStarted) => set({ hasStarted }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
