import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import {
  SUPPORTED_LANGUAGE_VALUES,
  type SupportedLanguage,
} from './supportedLanguages'

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
  language: z
    .enum(
      SUPPORTED_LANGUAGE_VALUES as unknown as [
        SupportedLanguage,
        ...SupportedLanguage[],
      ],
    )
    .default('auto'),
})

const TARGET_MAX_LINES = 16
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

const structuredRootSchema = z.object({
  language: z.string().optional(),
  lines: z.array(
    z.object({
      code: z.string(),
      explanation: z.string().optional().default(''),
    }),
  ),
})

const SYSTEM_PROMPT_JSON = [
  'You generate a correct program solution as strict JSON only (no markdown, no code fences, no extra text).',
  'Root object shape:',
  '{"language":"python","lines":[{"code":"…","explanation":"…"}]}',
  'Use javascript | typescript | python | java | cpp for language when known.',
  'Rules:',
  '1) "lines" is the full solution in execution order; one logical source line per item.',
  '2) "code" must include leading spaces or tabs for indentation as in real source.',
  '3) No comment-only lines; no //, /* */, or # in code.',
  '4) "explanation": one short plain-language phrase for a beginner about what that line does (keep under ~100 characters per line).',
  '5) Explanations must be produced now, in this same response — not left empty.',
  `6) At most ${TARGET_MAX_LINES} lines unless strictly necessary.`,
].join('\n')

const SYSTEM_PROMPT_PLAIN = [
  'You generate concise, runnable code solutions only.',
  'Output plain code text only, with no markdown and no surrounding explanation.',
  'Rules:',
  '1) solve the user task correctly.',
  '2) no comment-only lines.',
  '3) no trailing inline comments (// or /* */).',
  '4) no Python # comments on any line.',
  `5) keep it concise and usually under ${TARGET_MAX_LINES} lines unless strictly necessary.`,
].join('\n')

function stripInlineComments(line: string) {
  return line
    .replace(/\/\*.*?\*\//g, '')
    .replace(/\s+\/\/.*$/g, '')
    .trimEnd()
}

/** Remove trailing ` # comment` when # is not inside a simple quoted string. */
function stripPythonStyleTrailingComment(line: string): string {
  const m = line.match(/^(.*?)(\s+#.*)$/)
  if (!m) return line
  const before = m[1]
  const singleQuotes = (before.match(/'/g) ?? []).length
  const doubleQuotes = (before.match(/"/g) ?? []).length
  if (singleQuotes % 2 === 1 || doubleQuotes % 2 === 1) return line
  return before.trimEnd()
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

type Preprocessed = { cleanCode: string; rawSpaces: number }

function preprocessRawLine(piece: string): Preprocessed | null {
  const line = piece.replace(/\r/g, '')
  const rawSpaces = countLeadingWhitespace(line)
  let body = stripPythonStyleTrailingComment(line)
  body = stripInlineComments(body)
  const cleanCode = body.trimStart()

  if (
    cleanCode.length === 0
    || cleanCode.startsWith('//')
    || cleanCode.startsWith('/*')
    || cleanCode.startsWith('#')
  ) {
    return null
  }

  return { cleanCode, rawSpaces }
}

function toPuzzleLines(
  rows: Array<{ cleanCode: string; rawSpaces: number; explanation: string }>,
  resolvedLanguage: string,
): GeneratedPuzzle {
  const nonZeroIndents = rows.map((e) => e.rawSpaces).filter((s) => s > 0)
  const baseUnit = nonZeroIndents.length > 0 ? Math.min(...nonZeroIndents) : 1

  const lines: GeneratedLine[] = rows.map((entry, index) => ({
    id: `line-${index + 1}`,
    code: entry.cleanCode,
    explanation: entry.explanation,
    targetLine: index,
    targetIndent: Math.round(entry.rawSpaces / baseUnit),
  }))

  return { language: resolvedLanguage, lines }
}

function normalizeGeneratedPuzzle(codeText: string, selectedLanguage: string): GeneratedPuzzle {
  const rawLines = stripCodeFences(codeText).split(/\r?\n/)

  const parsed = rawLines
    .map((piece) => {
      const pre = preprocessRawLine(piece)
      if (!pre) return null
      return { cleanCode: pre.cleanCode, rawSpaces: pre.rawSpaces, explanation: '' }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .slice(0, TARGET_MAX_LINES)

  if (parsed.length === 0) {
    throw new Error('Model returned no usable code lines')
  }

  const resolvedLanguage =
    selectedLanguage === 'auto' ? detectLanguageFromCode(codeText) : selectedLanguage

  return toPuzzleLines(parsed, resolvedLanguage)
}

const EXPLAIN_FALLBACK = 'Explanation unavailable for this line.'

function buildPuzzleFromStructuredJson(
  data: z.infer<typeof structuredRootSchema>,
  selectedLanguage: string,
): GeneratedPuzzle | null {
  const parsed = data.lines
    .map((row) => {
      const pre = preprocessRawLine(row.code)
      if (!pre) return null
      const expl = (row.explanation ?? '').trim()
      return {
        cleanCode: pre.cleanCode,
        rawSpaces: pre.rawSpaces,
        explanation: expl.length > 0 ? expl : 'Briefly describes what this line does in the program.',
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .slice(0, TARGET_MAX_LINES)

  if (parsed.length === 0) return null

  const langFromModel = data.language?.trim().toLowerCase()
  const resolvedLanguage =
    selectedLanguage === 'auto'
      ? langFromModel && ['python', 'javascript', 'typescript', 'java', 'cpp'].includes(langFromModel)
        ? langFromModel
        : detectLanguageFromCode(parsed.map((r) => r.cleanCode).join('\n'))
      : selectedLanguage

  return toPuzzleLines(parsed, resolvedLanguage)
}

async function openaiChat(
  apiKey: string,
  messages: object[],
  maxTokens: number,
  jsonObject: boolean,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: MODEL,
    temperature: 0.2,
    max_tokens: maxTokens,
    messages,
  }
  if (jsonObject) body.response_format = { type: 'json_object' }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI request failed: ${errorText.slice(0, 500)}`)
  }

  const completion = await response.json()
  const rawContent = completion?.choices?.[0]?.message?.content
  if (typeof rawContent !== 'string' || rawContent.trim().length === 0) {
    throw new Error('OpenAI returned an empty response')
  }
  return rawContent
}

async function tryStructuredGeneration(
  apiKey: string,
  prompt: string,
  languageInstruction: string,
  selectedLanguage: string,
): Promise<GeneratedPuzzle | null> {
  try {
    const rawContent = await openaiChat(
      apiKey,
      [
        { role: 'system', content: SYSTEM_PROMPT_JSON },
        {
          role: 'user',
          content: `Task: ${prompt}\nLanguage preference: ${languageInstruction}`,
        },
      ],
      2400,
      true,
    )

    const parsed = JSON.parse(rawContent) as unknown
    const zResult = structuredRootSchema.safeParse(parsed)
    if (!zResult.success) return null

    return buildPuzzleFromStructuredJson(zResult.data, selectedLanguage)
  } catch {
    return null
  }
}

const explainResponseSchema = z.object({
  explanations: z.array(
    z.object({
      id: z.string(),
      explanation: z.string().min(1),
    }),
  ),
})

const EXPLAIN_SYSTEM = [
  'You explain code lines for beginners.',
  'Return strict JSON only in this exact shape:',
  '{"explanations":[{"id":"line-1","explanation":"..."}]}',
  'Rules:',
  '1) one explanation per provided id.',
  '2) concise plain language.',
  '3) do not include markdown.',
].join('\n')

function withExplanationFallback(puzzle: GeneratedPuzzle): GeneratedPuzzle {
  return {
    ...puzzle,
    lines: puzzle.lines.map((line) => ({
      ...line,
      explanation: line.explanation.trim().length > 0 ? line.explanation : EXPLAIN_FALLBACK,
    })),
  }
}

/** Same-handler fallback when structured JSON fails: plain code + one batched explain call. */
async function attachExplanationsInProcess(
  apiKey: string,
  language: string,
  puzzle: GeneratedPuzzle,
): Promise<GeneratedPuzzle> {
  const linesPayload = puzzle.lines.map((line) => ({ id: line.id, code: line.code }))

  try {
    const rawContent = await openaiChat(
      apiKey,
      [
        { role: 'system', content: EXPLAIN_SYSTEM },
        {
          role: 'user',
          content: JSON.stringify({ language, lines: linesPayload }),
        },
      ],
      900,
      true,
    )

    let parsed: unknown
    try {
      parsed = JSON.parse(rawContent) as unknown
    } catch {
      return withExplanationFallback(puzzle)
    }

    const zResult = explainResponseSchema.safeParse(parsed)
    if (!zResult.success) return withExplanationFallback(puzzle)

    const byId = new Map(zResult.data.explanations.map((e) => [e.id, e.explanation]))
    return {
      ...puzzle,
      lines: puzzle.lines.map((line) => ({
        ...line,
        explanation: (byId.get(line.id) ?? line.explanation).trim() || EXPLAIN_FALLBACK,
      })),
    }
  } catch {
    return withExplanationFallback(puzzle)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let body: unknown
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const requestResult = requestSchema.safeParse(body)

  if (!requestResult.success) {
    return res.status(400).json({
      error: 'Invalid request payload',
      details: requestResult.error.issues,
    })
  }

  const { prompt, apiKey, language } = requestResult.data

  const languageInstruction =
    language === 'auto'
      ? 'Infer the most suitable programming language from the user task if not explicitly stated.'
      : `Generate code strictly in ${language}.`

  try {
    let puzzle = await tryStructuredGeneration(apiKey, prompt, languageInstruction, language)

    if (!puzzle) {
      const rawContent = await openaiChat(
        apiKey,
        [
          { role: 'system', content: SYSTEM_PROMPT_PLAIN },
          {
            role: 'user',
            content: `Task: ${prompt}\nLanguage preference: ${languageInstruction}\nReturn only the final code.`,
          },
        ],
        700,
        false,
      )

      puzzle = normalizeGeneratedPuzzle(rawContent, language)
      puzzle = await attachExplanationsInProcess(apiKey, puzzle.language, puzzle)
    }

    return res.status(200).json(puzzle)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return res.status(500).json({ error: message })
  }
}
