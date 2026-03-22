import {
  generatePuzzleRequestSchema,
  generatedPuzzleSchema,
  type GeneratedPuzzle,
} from '../contracts/puzzle.schema'

/** Code + per-line explanations in one call can exceed 45s on slow networks; align with Vercel maxDuration where possible. */
const GENERATE_TIMEOUT_MS = 120_000

export async function generatePuzzle(request: {
  apiKey: string
  prompt: string
  language: 'auto' | 'javascript' | 'typescript' | 'python' | 'java' | 'cpp'
}): Promise<GeneratedPuzzle> {
  const payload = generatePuzzleRequestSchema.parse(request)
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS)

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      let details = 'Failed to generate puzzle'

      try {
        const body = await response.json()
        const detailText =
          typeof body?.details === 'string'
            ? body.details
            : Array.isArray(body?.details)
              ? JSON.stringify(body.details)
              : ''

        details = body?.error ?? details

        if (detailText.length > 0) {
          details = `${details}: ${detailText}`
        }
      } catch {
        // Use default details string.
      }

      throw new Error(details)
    }

    const data = await response.json()
    return generatedPuzzleSchema.parse(data)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        'Generation timed out after 2 minutes. Try again, use a shorter prompt, or check your network and API key.',
      )
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}
