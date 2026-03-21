import type { PuzzleLine } from './puzzle.store'

type ValidationInput = {
  lines: PuzzleLine[]
  targetIds: string[]
  sourceIds: string[]
  indentById: Record<string, number>
}

type ValidationResult = {
  incorrectIds: string[]
  isSolved: boolean
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

export function validatePuzzle(input: ValidationInput): ValidationResult {
  const { lines, targetIds, sourceIds, indentById } = input

  if (sourceIds.length > 0 || targetIds.length !== lines.length) {
    return { incorrectIds: [...targetIds], isSolved: false }
  }

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

  for (let index = 0; index < targetIds.length; index += 1) {
    const placedId = targetIds[index]
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
    const placedForKey = targetIds
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
