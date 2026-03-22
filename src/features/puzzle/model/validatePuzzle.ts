import type { PuzzleLine } from './puzzle.store'
import { isGapId } from './puzzle.store'

export type PuzzleLayoutMode = 'puzzle' | 'ordering'

type ValidationInput = {
  lines: PuzzleLine[]
  targetIds: string[]
  sourceIds: string[]
  indentById: Record<string, number>
  layoutMode: PuzzleLayoutMode
  orderingIds: string[]
}

export type ValidationResult = {
  incorrectIds: string[]
  isSolved: boolean
  /** When the puzzle isn’t finished — show this instead of marking placed lines wrong */
  checkFeedback?: string
}

function codeKey(line: PuzzleLine) {
  return line.code.trim()
}

function toCountMap(values: number[]) {
  const map = new Map<number, number>()

  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1)
  }

  return map
}

function sameMultiset(a: number[], b: number[]) {
  if (a.length !== b.length) {
    return false
  }

  const left = toCountMap(a)
  const right = toCountMap(b)

  if (left.size !== right.size) {
    return false
  }

  for (const [key, count] of left) {
    if (right.get(key) !== count) {
      return false
    }
  }

  return true
}

function validatePlacedOrder(
  lines: PuzzleLine[],
  placedIds: string[],
  indentById: Record<string, number>,
): ValidationResult {
  const lineById = Object.fromEntries(lines.map((line) => [line.id, line]))
  const expected = [...lines].sort((a, b) => a.targetLine - b.targetLine)

  const keyFrequency = new Map<string, number>()
  for (const line of expected) {
    const key = codeKey(line)
    keyFrequency.set(key, (keyFrequency.get(key) ?? 0) + 1)
  }

  const duplicateKeys = new Set(
    [...keyFrequency.entries()].filter(([, count]) => count > 1).map(([key]) => key),
  )

  const incorrect = new Set<string>()

  for (let index = 0; index < placedIds.length; index += 1) {
    const placedId = placedIds[index]
    const placed = lineById[placedId]
    const expectedLine = expected[index]

    if (!placed || !expectedLine) {
      incorrect.add(placedId)
      continue
    }

    const expectedKey = codeKey(expectedLine)

    if (duplicateKeys.has(expectedKey)) {
      continue
    }

    if (codeKey(placed) !== expectedKey || (indentById[placedId] ?? 0) !== expectedLine.targetIndent) {
      incorrect.add(placedId)
    }
  }

  for (const key of duplicateKeys) {
    const expectedForKey = expected.filter((line) => codeKey(line) === key)
    const placedForKey = placedIds
      .map((id) => lineById[id])
      .filter((line): line is PuzzleLine => Boolean(line) && codeKey(line) === key)

    if (placedForKey.length !== expectedForKey.length) {
      for (const line of placedForKey) {
        incorrect.add(line.id)
      }
      continue
    }

    const expectedIndents = expectedForKey.map((line) => line.targetIndent)
    const placedIndents = placedForKey.map((line) => indentById[line.id] ?? 0)

    if (!sameMultiset(expectedIndents, placedIndents)) {
      for (const line of placedForKey) {
        incorrect.add(line.id)
      }
    }
  }

  return {
    incorrectIds: [...incorrect],
    isSolved: incorrect.size === 0,
  }
}

export function validatePuzzle(input: ValidationInput): ValidationResult {
  const { lines, targetIds, sourceIds, indentById, layoutMode, orderingIds } = input

  if (layoutMode === 'ordering') {
    if (orderingIds.length !== lines.length) {
      return {
        incorrectIds: [],
        isSolved: false,
        checkFeedback: 'The ordered list is incomplete. Try generating the puzzle again.',
      }
    }
    return validatePlacedOrder(lines, orderingIds, indentById)
  }

  const placedIds = targetIds.filter((id) => !isGapId(id))
  const gapCount = targetIds.filter((id) => isGapId(id)).length
  const bankCount = sourceIds.length

  if (bankCount > 0 || placedIds.length !== lines.length) {
    let checkFeedback: string
    if (bankCount > 0 && gapCount > 0) {
      checkFeedback = `Finish the puzzle first: ${bankCount} line(s) still in the Code Bank and ${gapCount} empty slot(s). Place every line in the solution, then check again.`
    } else if (bankCount > 0) {
      checkFeedback = `Finish the puzzle first: move all ${bankCount} remaining line(s) from the Code Bank into the solution.`
    } else {
      checkFeedback = `Finish the puzzle first: fill all empty slots in the solution (${gapCount} left).`
    }
    return { incorrectIds: [], isSolved: false, checkFeedback }
  }

  return validatePlacedOrder(lines, placedIds, indentById)
}
