import {
  generatePuzzleRequestSchema,
  generatedPuzzleSchema,
  type GeneratedPuzzle,
} from '../contracts/puzzle.schema'
import { buildMockPuzzle } from './mockPuzzle'

export async function generatePuzzle(request: { apiKey: string; prompt: string }): Promise<GeneratedPuzzle> {
  const payload = generatePuzzleRequestSchema.parse(request)

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      if (import.meta.env.DEV) {
        return buildMockPuzzle(payload.prompt)
      }

      throw new Error('Failed to generate puzzle')
    }

    const data = await response.json()
    return generatedPuzzleSchema.parse(data)
  } catch (error) {
    if (import.meta.env.DEV) {
      return buildMockPuzzle(payload.prompt)
    }

    throw error
  }
}
