/**
 * Puzzle lines from the API or cache often include leading spaces/tabs that mirror nesting.
 * We strip that from `code` so:
 * - Code Bank cards are left-aligned (indentation is not “given away” in the text).
 * - Solution / ordering lanes show indent only via `indentById` × INDENT_STEP (and `targetIndent` for validation).
 *
 * Uses `trimStart()` only (not full `trim`) so rare meaningful trailing spaces on a line are kept.
 */
export function normalizePuzzleLineCode<T extends { code: string }>(lines: T[]): T[] {
  return lines.map((line) => ({
    ...line,
    code: line.code.trimStart(),
  }))
}
