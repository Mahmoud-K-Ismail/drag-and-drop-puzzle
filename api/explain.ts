import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

const requestSchema = z.object({
  apiKey: z.string().min(1),
  language: z.string().min(1),
  lines: z
    .array(
      z.object({
        id: z.string(),
        code: z.string().min(1),
      }),
    )
    .min(1),
})

const responseSchema = z.object({
  explanations: z.array(
    z.object({
      id: z.string(),
      explanation: z.string().min(1),
    }),
  ),
})

const SYSTEM_PROMPT = [
  'You explain code lines for beginners.',
  'Return strict JSON only in this exact shape:',
  '{"explanations":[{"id":"line-1","explanation":"..."}]}',
  'Rules:',
  '1) one explanation per provided id.',
  '2) concise plain language.',
  '3) do not include markdown.',
].join('\n')

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const requestResult = requestSchema.safeParse(body)

  if (!requestResult.success) {
    return res.status(400).json({ error: 'Invalid request payload', details: requestResult.error.issues })
  }

  const { apiKey, language, lines } = requestResult.data

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        max_tokens: 500,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({ language, lines }),
          },
        ],
      }),
    })

    if (!response.ok) {
      const details = await response.text()
      return res.status(response.status).json({ error: 'OpenAI request failed', details: details.slice(0, 1000) })
    }

    const completion = await response.json()
    const rawContent = completion?.choices?.[0]?.message?.content

    if (typeof rawContent !== 'string' || rawContent.trim().length === 0) {
      return res.status(502).json({ error: 'OpenAI returned an empty response' })
    }

    const parsed = JSON.parse(rawContent)
    const parsedResult = responseSchema.safeParse(parsed)

    if (!parsedResult.success) {
      return res.status(502).json({ error: 'Model returned unexpected format', details: parsedResult.error.issues })
    }

    return res.status(200).json(parsedResult.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return res.status(500).json({ error: message })
  }
}
