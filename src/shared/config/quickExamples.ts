/**
 * Curated prompts for the “Quick examples” dropdown.
 * Kept as static strings (not fetched from the API) so demos stay explicit in source control.
 *
 * For each prompt + concrete output language (JS/TS/Python/Java/C++), see `cachedQuickPuzzles.ts`:
 * Generate uses bundled line/explanation data (no OpenAI). `auto` still uses the API.
 */
export const QUICK_EXAMPLES = [
  'Write a function that uses a while loop to generate a fibonacci sequence.',
  'Write a function that checks if a string is a palindrome.',
  'Write a function that returns the factorial of a number using recursion.',
] as const

export type QuickExamplePrompt = (typeof QUICK_EXAMPLES)[number]
