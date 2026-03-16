import {
  generatePuzzleRequestSchema,
  generatedPuzzleSchema,
  type GeneratedPuzzle,
} from '../contracts/puzzle.schema'

export async function generatePuzzle(request: { apiKey: string; prompt: string }): Promise<GeneratedPuzzle> {
  const payload = generatePuzzleRequestSchema.parse(request)

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Failed to generate puzzle')
  }

  const data = await response.json()
  return generatedPuzzleSchema.parse(data)
}
