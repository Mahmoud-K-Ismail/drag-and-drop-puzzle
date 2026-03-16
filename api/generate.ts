import type { VercelRequest, VercelResponse } from '@vercel/node'

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const prompt = String(body?.prompt ?? '')
  const apiKey = String(body?.apiKey ?? '')

  if (prompt.trim().length === 0 || apiKey.trim().length === 0) {
    return res.status(400).json({ error: 'apiKey and prompt are required' })
  }

  const fallback: GeneratedPuzzle = {
    language: 'javascript',
    lines: [
      {
        id: '1',
        code: 'function add(a, b) {',
        explanation: 'Defines a function named add with two parameters.',
        targetLine: 0,
        targetIndent: 0,
      },
      {
        id: '2',
        code: 'return a + b',
        explanation: 'Returns the sum of the two inputs.',
        targetLine: 1,
        targetIndent: 1,
      },
      {
        id: '3',
        code: '}',
        explanation: 'Closes the function block.',
        targetLine: 2,
        targetIndent: 0,
      },
    ],
  }

  return res.status(200).json(fallback)
}
