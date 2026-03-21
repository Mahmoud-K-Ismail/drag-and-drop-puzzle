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
  language: z.enum(['auto', 'javascript', 'typescript', 'python', 'java', 'cpp']).default('auto'),
})

const TARGET_MAX_LINES = 16

const SYSTEM_PROMPT = [
  'You generate concise, runnable code solutions only.',
  'Output plain code text only, with no markdown and no surrounding explanation.',
  'Rules:',
  '1) solve the user task correctly.',
  '2) no comment-only lines.',
  '3) no trailing inline comments.',
  `4) keep it concise and usually under ${TARGET_MAX_LINES} lines unless strictly necessary.`,
].join('\n')

function stripInlineComments(line: string) {
  return line
    .replace(/\/\*.*?\*\//g, '')
    .replace(/\s+\/\/.*$/g, '')
    .trimEnd()
}

function countLeadingWhitespace(line: string) {
  const leadingTabs = (line.match(/^\t+/)?.[0].length ?? 0) * 4
  const leadingSpaces = line.match(/^ +/)?.[0].length ?? 0
  return leadingTabs + leadingSpaces
}

function stripCodeFences(code: string) {
  return code.replace(/^```[a-zA-Z0-9]*\n?/g, '').replace(/\n?```$/g, '')
}

function detectLanguageFromCode(codeText: string) {
  const code = codeText.toLowerCase()

  if (code.includes('def ') || code.includes('import ') || code.includes('elif ')) {
    return 'python'
  }

  if (code.includes('#include') || code.includes('std::') || code.includes('int main(')) {
    return 'cpp'
  }

  if (code.includes('public class ') || code.includes('system.out.println')) {
    return 'java'
  }

  if (code.includes(': string') || code.includes(': number') || code.includes('interface ')) {
    return 'typescript'
  }

  return 'javascript'
}

function normalizeGeneratedPuzzle(codeText: string, selectedLanguage: string): GeneratedPuzzle {
  const rawLines = stripCodeFences(codeText).split(/\r?\n/)

  const parsed = rawLines
    .map((piece) => {
      const rawSpaces = countLeadingWhitespace(piece)
      const cleanCode = stripInlineComments(piece).trimStart()

      if (cleanCode.length === 0 || cleanCode.startsWith('//') || cleanCode.startsWith('/*')) {
        return null
      }

      return { code: cleanCode, rawSpaces }
    })
    .filter((entry): entry is { code: string; rawSpaces: number } => entry !== null)
    .slice(0, TARGET_MAX_LINES)

  if (parsed.length === 0) {
    throw new Error('Model returned no usable code lines')
  }

  const nonZeroIndents = parsed.map((e) => e.rawSpaces).filter((s) => s > 0)
  const baseUnit = nonZeroIndents.length > 0 ? Math.min(...nonZeroIndents) : 1

  const normalizedLines = parsed.map((entry, index) => ({
    id: `line-${index + 1}`,
    code: entry.code,
    explanation: '',
    targetLine: index,
    targetIndent: Math.round(entry.rawSpaces / baseUnit),
  }))

  const resolvedLanguage =
    selectedLanguage === 'auto' ? detectLanguageFromCode(codeText) : selectedLanguage

  return {
    language: resolvedLanguage,
    lines: normalizedLines,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const requestResult = requestSchema.safeParse(body)

  if (!requestResult.success) {
    return res.status(400).json({
      error: 'Invalid request payload',
      details: requestResult.error.issues,
    })
  }

  const { prompt, apiKey, language } = requestResult.data

  try {
    const languageInstruction =
      language === 'auto'
        ? 'Infer the most suitable programming language from the user task if not explicitly stated.'
        : `Generate code strictly in ${language}.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Task: ${prompt}\nLanguage preference: ${languageInstruction}\nReturn only the final code.`,
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

    const normalizedPuzzle = normalizeGeneratedPuzzle(rawContent, language)

    return res.status(200).json(normalizedPuzzle)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return res.status(500).json({ error: message })
  }
}
