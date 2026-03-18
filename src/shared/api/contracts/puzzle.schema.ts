import { z } from 'zod'

export const generatedLineSchema = z.object({
  id: z.string(),
  code: z.string().min(1),
  explanation: z.string().min(1),
  targetLine: z.number().int().nonnegative(),
  targetIndent: z.number().int().nonnegative(),
})

export const generatedPuzzleSchema = z.object({
  language: z.string().min(1),
  lines: z.array(generatedLineSchema).min(1),
})

export const generatePuzzleRequestSchema = z.object({
  apiKey: z.string().min(1),
  prompt: z.string().min(1),
  language: z
    .enum(['auto', 'javascript', 'typescript', 'python', 'java', 'cpp'])
    .default('auto'),
})

export type GeneratedPuzzle = z.infer<typeof generatedPuzzleSchema>
export type GeneratePuzzleRequest = z.infer<typeof generatePuzzleRequestSchema>
