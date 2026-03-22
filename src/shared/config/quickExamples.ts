/**
 * Curated prompts for the “Quick examples” dropdown.
 * Kept as static strings (not fetched/cached from the API) so demos work offline in the UI
 * and the rubric’s “≥3 predefined tasks” stays explicit in source control.
 */
export const QUICK_EXAMPLES = [
  'Write a function that uses a while loop to generate a fibonacci sequence.',
  'Write a function that checks if a string is a palindrome.',
  'Write a function that returns the factorial of a number using recursion.',
] as const

export type QuickExamplePrompt = (typeof QUICK_EXAMPLES)[number]
