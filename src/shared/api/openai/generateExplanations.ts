import {
  explainRequestSchema,
  explainResponseSchema,
  type ExplainResponse,
} from '../contracts/puzzle.schema'

const EXPLAIN_TIMEOUT_MS = 35000

export async function generateExplanations(request: {
  apiKey: string
  language: string
  lines: Array<{ id: string; code: string }>
}): Promise<ExplainResponse['explanations']> {
  const payload = explainRequestSchema.parse(request)
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), EXPLAIN_TIMEOUT_MS)

  try {
    const response = await fetch('/api/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error('Failed to generate explanations')
    }

    const data = await response.json()
    const parsed = explainResponseSchema.parse(data)
    return parsed.explanations
  } finally {
    window.clearTimeout(timeoutId)
  }
}