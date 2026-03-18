import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

type GeneratedLine = {
  id: string
  code: string
  explanation: string
  targetLine: number
  targetIndent: number
}

type GeneratedPuzzle = {
  language: string
  lines: GeneratedLine[]
}

const requestSchema = z.object({
  apiKey: z.string().min(1),
  prompt: z.string().min(1),
})

const openAiLineSchema = z.object({
  code: z.string(),
  explanation: z.string(),
  targetIndent: z.number().int().nonnegative().optional(),
})

const openAiPuzzleSchema = z.object({
  language: z.string().min(1),
  lines: z.array(openAiLineSchema).min(1),
})

const SYSTEM_PROMPT = [
  'You generate educational code puzzle data.',
  'Output only valid JSON with this exact shape:',
  '{"language":"string","lines":[{"code":"string","explanation":"string","targetIndent":number}]}',
  'Rules:',
  '1) code must solve the user task.',
  '2) no lines that are comments only.',
  '3) no trailing comments at the end of code lines.',
  '4) explanations must be short and natural language.',
  '5) each line should be one meaningful code line.',
  '6) keep targetIndent as non-negative integer where 0 means no indentation.',
  '7) do not wrap the JSON in markdown.',
].join('\n')

function stripInlineComments(line: string) {
  return line
    .replace(/\/\*.*?\*\//g, '')
    .replace(/\s+\/\/.*$/g, '')
    .trimEnd()
}

function estimateIndent(line: string) {
  const leadingTabs = (line.match(/^\t+/)?.[0].length ?? 0) * 2
  const leadingSpaces = line.match(/^ +/)?.[0].length ?? 0
  return Math.floor((leadingTabs + leadingSpaces) / 2)
}

function normalizeGeneratedPuzzle(raw: z.infer<typeof openAiPuzzleSchema>): GeneratedPuzzle {
  const normalizedLines = raw.lines
    .map((line, index) => {
      const indentFromCode = estimateIndent(line.code)
      const cleanCode = stripInlineComments(line.code).trimStart()

      if (cleanCode.length === 0 || cleanCode.startsWith('//') || cleanCode.startsWith('/*')) {
        return null
      }

      return {
        id: `line-${index + 1}`,
        code: cleanCode,
        explanation: line.explanation.trim() || 'This line contributes to the solution.',
        targetLine: index,
        targetIndent: line.targetIndent ?? indentFromCode,
      }
    })
    .filter((line): line is GeneratedLine => line !== null)

  if (normalizedLines.length === 0) {
    throw new Error('Model returned no usable code lines')
  }

  return {
    language: raw.language,
    lines: normalizedLines,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { prompt, apiKey } = requestSchema.parse(body)

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
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Task: ${prompt}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(response.status).json({
        error: 'OpenAI request failed',
        details: errorText.slice(0, 1000),
      })
    }

    const completion = await response.json()
    const rawContent = completion?.choices?.[0]?.message?.content

    if (typeof rawContent !== 'string' || rawContent.trim().length === 0) {
      return res.status(502).json({ error: 'OpenAI returned an empty response' })
    }

    const parsedPayload = JSON.parse(rawContent)
    const rawPuzzle = openAiPuzzleSchema.parse(parsedPayload)
    const normalizedPuzzle = normalizeGeneratedPuzzle(rawPuzzle)

    return res.status(200).json(normalizedPuzzle)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request payload', details: error.issues })
    }

    const message = error instanceof Error ? error.message : 'Unknown server error'
    return res.status(500).json({ error: message })
  }
}
