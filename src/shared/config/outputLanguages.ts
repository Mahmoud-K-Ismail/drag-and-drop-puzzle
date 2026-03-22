/**
 * Output language dropdown + API `language` field.
 * Single source of truth: keep `puzzle.schema` / `api/generate` z.enum aligned with this tuple.
 */
export const SUPPORTED_LANGUAGE_VALUES = [
  'auto',
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGE_VALUES)[number]

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  auto: 'Auto-detect from prompt',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
}

export const OUTPUT_LANGUAGES = SUPPORTED_LANGUAGE_VALUES.map((value) => ({
  value,
  label: LANGUAGE_LABELS[value],
}))
