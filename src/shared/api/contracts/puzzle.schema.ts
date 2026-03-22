import { z } from 'zod'
import {
  SUPPORTED_LANGUAGE_VALUES,
  type SupportedLanguage,
} from '../../config/outputLanguages'

export const generatedLineSchema = z.object({
  id: z.string(),
  code: z.string().min(1),
  explanation: z.string().default(''),
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
    .enum(
      SUPPORTED_LANGUAGE_VALUES as unknown as [
        SupportedLanguage,
        ...SupportedLanguage[],
      ],
    )
    .default('auto'),
})

export const explainLineSchema = z.object({
  id: z.string(),
  code: z.string().min(1),
})

export const explainRequestSchema = z.object({
  apiKey: z.string().min(1),
  language: z.string().min(1),
  lines: z.array(explainLineSchema).min(1),
})

export const explainResponseSchema = z.object({
  explanations: z.array(
    z.object({
      id: z.string(),
      explanation: z.string().min(1),
    }),
  ),
})

export type GeneratedPuzzle = z.infer<typeof generatedPuzzleSchema>
export type GeneratePuzzleRequest = z.infer<typeof generatePuzzleRequestSchema>
export type ExplainRequest = z.infer<typeof explainRequestSchema>
export type ExplainResponse = z.infer<typeof explainResponseSchema>
