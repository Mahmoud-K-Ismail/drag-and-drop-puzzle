import type { GeneratedPuzzle } from '../contracts/puzzle.schema'

function normalizeTaskLabel(prompt: string) {
  const trimmed = prompt.trim()
  if (trimmed.length === 0) {
    return 'task'
  }

  return trimmed.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 24).toLowerCase() || 'task'
}

export function buildMockPuzzle(prompt: string): GeneratedPuzzle {
  const taskLabel = normalizeTaskLabel(prompt)

  return {
    language: 'javascript',
    lines: [
      {
        id: 'line-1',
        code: `function solve_${taskLabel}(input) {`,
        explanation: 'Defines the solution function and receives one input value.',
        targetLine: 0,
        targetIndent: 0,
      },
      {
        id: 'line-2',
        code: 'const output = input',
        explanation: 'Initializes an output variable from the input.',
        targetLine: 1,
        targetIndent: 1,
      },
      {
        id: 'line-3',
        code: 'return output',
        explanation: 'Returns the computed result.',
        targetLine: 2,
        targetIndent: 1,
      },
      {
        id: 'line-4',
        code: '}',
        explanation: 'Closes the function body.',
        targetLine: 3,
        targetIndent: 0,
      },
    ],
  }
}
