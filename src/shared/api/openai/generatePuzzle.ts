import type { SupportedLanguage } from '../../config/outputLanguages'
import { devLog, devWarn } from '../../lib/devLog'
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
  language: SupportedLanguage
}): Promise<GeneratedPuzzle> {
  const payload = generatePuzzleRequestSchema.parse(request)
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS)
  const t0 = performance.now()

  try {
    devLog('api', 'POST /api/generate', {
      language: payload.language,
      promptLength: payload.prompt.length,
      hasApiKey: payload.apiKey.length > 0,
    })

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
    const parsed = generatedPuzzleSchema.parse(data)
    devLog('api', 'generate OK', {
      lineCount: parsed.lines.length,
      language: parsed.language,
      ms: Math.round(performance.now() - t0),
    })
    return parsed
  } catch (error) {
    devWarn('api', 'generate failed', error)
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
