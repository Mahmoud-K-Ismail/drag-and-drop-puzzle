/**
 * Request `language` values for `api/generate.ts`.
 * Keep in sync with `src/shared/config/outputLanguages.ts` (SUPPORTED_LANGUAGE_VALUES).
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
