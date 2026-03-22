import type { GeneratedPuzzle } from '../api/contracts/puzzle.schema'
import type { SupportedLanguage } from './outputLanguages'
import { QUICK_EXAMPLES, type QuickExamplePrompt } from './quickExamples'

/** Languages with offline snapshots (excludes `auto`, which still uses the API). */
export type ConcreteOutputLanguage = Exclude<SupportedLanguage, 'auto'>

function buildPuzzle(
  language: string,
  rows: Array<{ id: string; code: string; explanation: string; indent: number }>,
): GeneratedPuzzle {
  return {
    language,
    lines: rows.map((row, targetLine) => ({
      id: row.id,
      code: row.code,
      explanation: row.explanation,
      targetLine,
      targetIndent: row.indent,
    })),
  }
}

const FIB_PROMPT = QUICK_EXAMPLES[0]
const PAL_PROMPT = QUICK_EXAMPLES[1]
const FACT_PROMPT = QUICK_EXAMPLES[2]

const FIBONACCI_CACHED: Record<ConcreteOutputLanguage, GeneratedPuzzle> = {
  javascript: buildPuzzle('javascript', [
    { id: 'fib-js-0', code: 'function fibonacciWhile(n) {', explanation: 'Start the function that builds a Fibonacci sequence with a while loop.', indent: 0 },
    { id: 'fib-js-1', code: '  const seq = [0, 1];', explanation: 'Seed the sequence with the first two Fibonacci numbers.', indent: 1 },
    { id: 'fib-js-2', code: '  let i = 2;', explanation: 'Start the loop index after the seeded values.', indent: 1 },
    { id: 'fib-js-3', code: '  while (i < n) {', explanation: 'Keep generating until we have n elements.', indent: 1 },
    { id: 'fib-js-4', code: '    seq.push(seq[i - 1] + seq[i - 2]);', explanation: 'Append the sum of the previous two entries.', indent: 2 },
    { id: 'fib-js-5', code: '    i++;', explanation: 'Advance the index for the next iteration.', indent: 2 },
    { id: 'fib-js-6', code: '  }', explanation: 'End of the while loop.', indent: 1 },
    { id: 'fib-js-7', code: '  return seq.slice(0, Math.max(0, n));', explanation: 'Return the first n elements (handles small n safely).', indent: 1 },
    { id: 'fib-js-8', code: '}', explanation: 'Close the function.', indent: 0 },
  ]),
  typescript: buildPuzzle('typescript', [
    { id: 'fib-ts-0', code: 'function fibonacciWhile(n: number): number[] {', explanation: 'Declare the function with typed parameter and return type.', indent: 0 },
    { id: 'fib-ts-1', code: '  const seq: number[] = [0, 1];', explanation: 'Typed array holding the growing Fibonacci sequence.', indent: 1 },
    { id: 'fib-ts-2', code: '  let i = 2;', explanation: 'Loop counter starts after the two seeded values.', indent: 1 },
    { id: 'fib-ts-3', code: '  while (i < n) {', explanation: 'Continue until the sequence length reaches n.', indent: 1 },
    { id: 'fib-ts-4', code: '    seq.push(seq[i - 1] + seq[i - 2]);', explanation: 'Next Fibonacci number from the two prior elements.', indent: 2 },
    { id: 'fib-ts-5', code: '    i++;', explanation: 'Increment to build the next slot.', indent: 2 },
    { id: 'fib-ts-6', code: '  }', explanation: 'End while.', indent: 1 },
    { id: 'fib-ts-7', code: '  return seq.slice(0, Math.max(0, n));', explanation: 'Trim to length n (or empty when n is 0).', indent: 1 },
    { id: 'fib-ts-8', code: '}', explanation: 'End function body.', indent: 0 },
  ]),
  python: buildPuzzle('python', [
    { id: 'fib-py-0', code: 'def fibonacci_while(n):', explanation: 'Define the Python function.', indent: 0 },
    { id: 'fib-py-1', code: '    seq = [0, 1]', explanation: 'Initialize the list with the first two Fibonacci numbers.', indent: 1 },
    { id: 'fib-py-2', code: '    i = 2', explanation: 'Index for the next position to fill.', indent: 1 },
    { id: 'fib-py-3', code: '    while i < n:', explanation: 'Loop until the list has n items.', indent: 1 },
    { id: 'fib-py-4', code: '        seq.append(seq[i - 1] + seq[i - 2])', explanation: 'Append sum of previous two entries.', indent: 2 },
    { id: 'fib-py-5', code: '        i += 1', explanation: 'Move to the next index.', indent: 2 },
    { id: 'fib-py-6', code: '    return seq[:max(0, n)]', explanation: 'Return the first n elements.', indent: 1 },
  ]),
  java: buildPuzzle('java', [
    { id: 'fib-jv-0', code: 'static int[] fibonacciWhile(int n) {', explanation: 'Method returning an int array of length up to n.', indent: 0 },
    { id: 'fib-jv-1', code: '  if (n <= 0) {', explanation: 'Handle the empty case.', indent: 1 },
    { id: 'fib-jv-2', code: '    return new int[0];', explanation: 'No elements requested.', indent: 2 },
    { id: 'fib-jv-3', code: '  }', explanation: 'End guard clause.', indent: 1 },
    { id: 'fib-jv-4', code: '  int[] seq = new int[n];', explanation: 'Allocate exactly n slots.', indent: 1 },
    { id: 'fib-jv-5', code: '  seq[0] = 0;', explanation: 'First Fibonacci number.', indent: 1 },
    { id: 'fib-jv-6', code: '  if (n == 1) {', explanation: 'Only one value needed.', indent: 1 },
    { id: 'fib-jv-7', code: '    return seq;', explanation: 'Return [0].', indent: 2 },
    { id: 'fib-jv-8', code: '  }', explanation: 'End single-element branch.', indent: 1 },
    { id: 'fib-jv-9', code: '  seq[1] = 1;', explanation: 'Second Fibonacci number.', indent: 1 },
    { id: 'fib-jv-10', code: '  int i = 2;', explanation: 'Start filling from index 2.', indent: 1 },
    { id: 'fib-jv-11', code: '  while (i < n) {', explanation: 'Fill remaining indices.', indent: 1 },
    { id: 'fib-jv-12', code: '    seq[i] = seq[i - 1] + seq[i - 2];', explanation: 'Classic Fibonacci recurrence.', indent: 2 },
    { id: 'fib-jv-13', code: '    i++;', explanation: 'Next index.', indent: 2 },
    { id: 'fib-jv-14', code: '  }', explanation: 'End loop.', indent: 1 },
    { id: 'fib-jv-15', code: '  return seq;', explanation: 'Return the filled array.', indent: 1 },
    { id: 'fib-jv-16', code: '}', explanation: 'End method.', indent: 0 },
  ]),
  cpp: buildPuzzle('cpp', [
    { id: 'fib-cpp-0', code: '#include <vector>', explanation: 'Pull in std::vector for the sequence.', indent: 0 },
    { id: 'fib-cpp-2', code: 'std::vector<int> fibonacciWhile(int n) {', explanation: 'Function returns a vector of Fibonacci numbers.', indent: 0 },
    { id: 'fib-cpp-3', code: '  if (n <= 0) {', explanation: 'Guard for non-positive n.', indent: 1 },
    { id: 'fib-cpp-4', code: '    return {};', explanation: 'Empty vector.', indent: 2 },
    { id: 'fib-cpp-5', code: '  }', explanation: 'End guard.', indent: 1 },
    { id: 'fib-cpp-6', code: '  std::vector<int> seq(n);', explanation: 'Pre-size to n elements.', indent: 1 },
    { id: 'fib-cpp-7', code: '  seq[0] = 0;', explanation: 'F(0).', indent: 1 },
    { id: 'fib-cpp-8', code: '  if (n == 1) {', explanation: 'Only one value required.', indent: 1 },
    { id: 'fib-cpp-9', code: '    return seq;', explanation: 'Return [0].', indent: 2 },
    { id: 'fib-cpp-10', code: '  }', explanation: 'End branch.', indent: 1 },
    { id: 'fib-cpp-11', code: '  seq[1] = 1;', explanation: 'F(1).', indent: 1 },
    { id: 'fib-cpp-12', code: '  int i = 2;', explanation: 'Start at third slot.', indent: 1 },
    { id: 'fib-cpp-13', code: '  while (i < n) {', explanation: 'Compute up to length n.', indent: 1 },
    { id: 'fib-cpp-14', code: '    seq[i] = seq[i - 1] + seq[i - 2];', explanation: 'Recurrence relation.', indent: 2 },
    { id: 'fib-cpp-15', code: '    i++;', explanation: 'Advance.', indent: 2 },
    { id: 'fib-cpp-16', code: '  }', explanation: 'End while.', indent: 1 },
    { id: 'fib-cpp-17', code: '  return seq;', explanation: 'Return completed sequence.', indent: 1 },
    { id: 'fib-cpp-18', code: '}', explanation: 'End function.', indent: 0 },
  ]),
}

const PALINDROME_CACHED: Record<ConcreteOutputLanguage, GeneratedPuzzle> = {
  javascript: buildPuzzle('javascript', [
    { id: 'pal-js-0', code: 'function isPalindrome(s) {', explanation: 'Start the palindrome checker.', indent: 0 },
    { id: 'pal-js-1', code: "  const t = s.toLowerCase().replace(/[^a-z0-9]/g, '');", explanation: 'Normalize: lowercase and strip non-alphanumeric characters.', indent: 1 },
    { id: 'pal-js-2', code: '  let left = 0;', explanation: 'Left pointer at the start.', indent: 1 },
    { id: 'pal-js-3', code: '  let right = t.length - 1;', explanation: 'Right pointer at the end.', indent: 1 },
    { id: 'pal-js-4', code: '  while (left < right) {', explanation: 'Compare characters moving inward.', indent: 1 },
    { id: 'pal-js-5', code: '    if (t[left] !== t[right]) {', explanation: 'Mismatch means not a palindrome.', indent: 2 },
    { id: 'pal-js-6', code: '      return false;', explanation: 'Early exit on mismatch.', indent: 3 },
    { id: 'pal-js-7', code: '    }', explanation: 'End mismatch branch.', indent: 2 },
    { id: 'pal-js-8', code: '    left++;', explanation: 'Move left pointer right.', indent: 2 },
    { id: 'pal-js-9', code: '    right--;', explanation: 'Move right pointer left.', indent: 2 },
    { id: 'pal-js-10', code: '  }', explanation: 'End comparisons.', indent: 1 },
    { id: 'pal-js-11', code: '  return true;', explanation: 'All mirrored pairs matched.', indent: 1 },
    { id: 'pal-js-12', code: '}', explanation: 'End function.', indent: 0 },
  ]),
  typescript: buildPuzzle('typescript', [
    { id: 'pal-ts-0', code: 'function isPalindrome(s: string): boolean {', explanation: 'Typed function returning a boolean.', indent: 0 },
    { id: 'pal-ts-1', code: "  const t = s.toLowerCase().replace(/[^a-z0-9]/g, '');", explanation: 'Normalize the string for comparison.', indent: 1 },
    { id: 'pal-ts-2', code: '  let left = 0;', explanation: 'Start index.', indent: 1 },
    { id: 'pal-ts-3', code: '  let right = t.length - 1;', explanation: 'End index.', indent: 1 },
    { id: 'pal-ts-4', code: '  while (left < right) {', explanation: 'Two-pointer scan.', indent: 1 },
    { id: 'pal-ts-5', code: '    if (t[left] !== t[right]) {', explanation: 'Characters must match at mirrored positions.', indent: 2 },
    { id: 'pal-ts-6', code: '      return false;', explanation: 'Fail fast.', indent: 3 },
    { id: 'pal-ts-7', code: '    }', explanation: 'End if.', indent: 2 },
    { id: 'pal-ts-8', code: '    left++;', explanation: 'Shrink window from the left.', indent: 2 },
    { id: 'pal-ts-9', code: '    right--;', explanation: 'Shrink window from the right.', indent: 2 },
    { id: 'pal-ts-10', code: '  }', explanation: 'Loop complete.', indent: 1 },
    { id: 'pal-ts-11', code: '  return true;', explanation: 'Palindrome confirmed.', indent: 1 },
    { id: 'pal-ts-12', code: '}', explanation: 'End.', indent: 0 },
  ]),
  python: buildPuzzle('python', [
    { id: 'pal-py-0', code: 'def is_palindrome(s):', explanation: 'Define the checker.', indent: 0 },
    { id: 'pal-py-1', code: "    t = ''.join(c for c in s.lower() if c.isalnum())", explanation: 'Keep only alphanumeric, lowercased.', indent: 1 },
    { id: 'pal-py-2', code: '    left, right = 0, len(t) - 1', explanation: 'Initialize two pointers.', indent: 1 },
    { id: 'pal-py-3', code: '    while left < right:', explanation: 'Walk toward the center.', indent: 1 },
    { id: 'pal-py-4', code: '        if t[left] != t[right]:', explanation: 'Compare mirrored characters.', indent: 2 },
    { id: 'pal-py-5', code: '            return False', explanation: 'Mismatch.', indent: 3 },
    { id: 'pal-py-6', code: '        left += 1', explanation: 'Advance left.', indent: 2 },
    { id: 'pal-py-7', code: '        right -= 1', explanation: 'Advance right.', indent: 2 },
    { id: 'pal-py-8', code: '    return True', explanation: 'Survived all checks.', indent: 1 },
  ]),
  java: buildPuzzle('java', [
    { id: 'pal-jv-0', code: 'static boolean isPalindrome(String s) {', explanation: 'Static helper on a string.', indent: 0 },
    { id: 'pal-jv-1', code: '  StringBuilder cleaned = new StringBuilder();', explanation: 'Collect normalized characters.', indent: 1 },
    { id: 'pal-jv-2', code: '  for (char c : s.toLowerCase().toCharArray()) {', explanation: 'Inspect each lowercase character.', indent: 1 },
    { id: 'pal-jv-3', code: '    if (Character.isLetterOrDigit(c)) {', explanation: 'Skip spaces and punctuation.', indent: 2 },
    { id: 'pal-jv-4', code: '      cleaned.append(c);', explanation: 'Keep alphanumeric only.', indent: 3 },
    { id: 'pal-jv-5', code: '    }', explanation: 'End filter.', indent: 2 },
    { id: 'pal-jv-6', code: '  }', explanation: 'End for-each.', indent: 1 },
    { id: 'pal-jv-7', code: '  int left = 0;', explanation: 'Left index.', indent: 1 },
    { id: 'pal-jv-8', code: '  int right = cleaned.length() - 1;', explanation: 'Right index.', indent: 1 },
    { id: 'pal-jv-9', code: '  while (left < right) {', explanation: 'Meet in the middle.', indent: 1 },
    { id: 'pal-jv-10', code: '    if (cleaned.charAt(left) != cleaned.charAt(right)) {', explanation: 'Symmetry check.', indent: 2 },
    { id: 'pal-jv-11', code: '      return false;', explanation: 'Not a palindrome.', indent: 3 },
    { id: 'pal-jv-12', code: '    }', explanation: 'End if.', indent: 2 },
    { id: 'pal-jv-13', code: '    left++;', explanation: 'Move inward.', indent: 2 },
    { id: 'pal-jv-14', code: '    right--;', explanation: 'Move inward.', indent: 2 },
    { id: 'pal-jv-15', code: '  }', explanation: 'End while.', indent: 1 },
    { id: 'pal-jv-16', code: '  return true;', explanation: 'Success.', indent: 1 },
    { id: 'pal-jv-17', code: '}', explanation: 'End method.', indent: 0 },
  ]),
  cpp: buildPuzzle('cpp', [
    { id: 'pal-cpp-0', code: '#include <cctype>', explanation: 'Character classification helpers.', indent: 0 },
    { id: 'pal-cpp-1', code: '#include <string>', explanation: 'std::string for text.', indent: 0 },
    { id: 'pal-cpp-3', code: 'bool isPalindrome(const std::string& s) {', explanation: 'Function taking the input string by const reference.', indent: 0 },
    { id: 'pal-cpp-4', code: '  std::string t;', explanation: 'Normalized characters.', indent: 1 },
    { id: 'pal-cpp-5', code: '  for (char c : s) {', explanation: 'Scan original string.', indent: 1 },
    { id: 'pal-cpp-6', code: '    unsigned char u = static_cast<unsigned char>(c);', explanation: 'Safe call to cctype helpers.', indent: 2 },
    { id: 'pal-cpp-7', code: '    if (std::isalnum(u)) {', explanation: 'Letters and digits only.', indent: 2 },
    { id: 'pal-cpp-8', code: '      t.push_back(std::tolower(u));', explanation: 'Append lowercased alphanumeric.', indent: 3 },
    { id: 'pal-cpp-9', code: '    }', explanation: 'End if.', indent: 2 },
    { id: 'pal-cpp-10', code: '  }', explanation: 'End for.', indent: 1 },
    { id: 'pal-cpp-11', code: '  int left = 0;', explanation: 'Start index (signed avoids empty-string underflow).', indent: 1 },
    { id: 'pal-cpp-12', code: '  int right = static_cast<int>(t.size()) - 1;', explanation: 'End index; empty t yields right = -1, loop skipped.', indent: 1 },
    { id: 'pal-cpp-13', code: '  while (left < right) {', explanation: 'Compare toward center.', indent: 1 },
    { id: 'pal-cpp-14', code: '    if (t[left] != t[right]) {', explanation: 'Mismatch check.', indent: 2 },
    { id: 'pal-cpp-15', code: '      return false;', explanation: 'Not palindrome.', indent: 3 },
    { id: 'pal-cpp-16', code: '    }', explanation: 'End if.', indent: 2 },
    { id: 'pal-cpp-17', code: '    left++;', explanation: 'Advance left.', indent: 2 },
    { id: 'pal-cpp-18', code: '    right--;', explanation: 'Advance right.', indent: 2 },
    { id: 'pal-cpp-19', code: '  }', explanation: 'End loop.', indent: 1 },
    { id: 'pal-cpp-20', code: '  return true;', explanation: 'All pairs matched.', indent: 1 },
    { id: 'pal-cpp-21', code: '}', explanation: 'End function.', indent: 0 },
  ]),
}

const FACTORIAL_CACHED: Record<ConcreteOutputLanguage, GeneratedPuzzle> = {
  javascript: buildPuzzle('javascript', [
    { id: 'fact-js-0', code: 'function factorial(n) {', explanation: 'Recursive factorial function.', indent: 0 },
    { id: 'fact-js-1', code: '  if (n <= 1) {', explanation: 'Base case: 0! and 1! are 1.', indent: 1 },
    { id: 'fact-js-2', code: '    return 1;', explanation: 'Stop recursion here.', indent: 2 },
    { id: 'fact-js-3', code: '  }', explanation: 'End base case.', indent: 1 },
    { id: 'fact-js-4', code: '  return n * factorial(n - 1);', explanation: 'Inductive step: n * (n-1)!', indent: 1 },
    { id: 'fact-js-5', code: '}', explanation: 'End function.', indent: 0 },
  ]),
  typescript: buildPuzzle('typescript', [
    { id: 'fact-ts-0', code: 'function factorial(n: number): number {', explanation: 'Typed recursive factorial.', indent: 0 },
    { id: 'fact-ts-1', code: '  if (n <= 1) {', explanation: 'Base case.', indent: 1 },
    { id: 'fact-ts-2', code: '    return 1;', explanation: 'Return multiplicative identity.', indent: 2 },
    { id: 'fact-ts-3', code: '  }', explanation: 'End if.', indent: 1 },
    { id: 'fact-ts-4', code: '  return n * factorial(n - 1);', explanation: 'Recursive multiply.', indent: 1 },
    { id: 'fact-ts-5', code: '}', explanation: 'End.', indent: 0 },
  ]),
  python: buildPuzzle('python', [
    { id: 'fact-py-0', code: 'def factorial(n):', explanation: 'Recursive definition in Python.', indent: 0 },
    { id: 'fact-py-1', code: '    if n <= 1:', explanation: 'Base case guard.', indent: 1 },
    { id: 'fact-py-2', code: '        return 1', explanation: '0! and 1!.', indent: 2 },
    { id: 'fact-py-3', code: '    return n * factorial(n - 1)', explanation: 'Recursive call.', indent: 1 },
  ]),
  java: buildPuzzle('java', [
    { id: 'fact-jv-0', code: 'static int factorial(int n) {', explanation: 'Recursive static method.', indent: 0 },
    { id: 'fact-jv-1', code: '  if (n <= 1) {', explanation: 'Termination condition.', indent: 1 },
    { id: 'fact-jv-2', code: '    return 1;', explanation: 'Factorial base.', indent: 2 },
    { id: 'fact-jv-3', code: '  }', explanation: 'End if.', indent: 1 },
    { id: 'fact-jv-4', code: '  return n * factorial(n - 1);', explanation: 'Recursive product.', indent: 1 },
    { id: 'fact-jv-5', code: '}', explanation: 'End method.', indent: 0 },
  ]),
  cpp: buildPuzzle('cpp', [
    { id: 'fact-cpp-0', code: 'int factorial(int n) {', explanation: 'C++ recursive factorial.', indent: 0 },
    { id: 'fact-cpp-1', code: '  if (n <= 1) {', explanation: 'Base case.', indent: 1 },
    { id: 'fact-cpp-2', code: '    return 1;', explanation: 'Stop here.', indent: 2 },
    { id: 'fact-cpp-3', code: '  }', explanation: 'End base.', indent: 1 },
    { id: 'fact-cpp-4', code: '  return n * factorial(n - 1);', explanation: 'Recurse.', indent: 1 },
    { id: 'fact-cpp-5', code: '}', explanation: 'End function.', indent: 0 },
  ]),
}

const BY_PROMPT: Record<QuickExamplePrompt, Record<ConcreteOutputLanguage, GeneratedPuzzle>> = {
  [FIB_PROMPT]: FIBONACCI_CACHED,
  [PAL_PROMPT]: PALINDROME_CACHED,
  [FACT_PROMPT]: FACTORIAL_CACHED,
}

/**
 * Offline puzzle for a curated quick example + concrete language (not `auto`).
 * Uses bundled line/explanation data — no OpenAI round-trip.
 */
export function getCachedQuickPuzzle(
  prompt: string,
  language: SupportedLanguage,
): GeneratedPuzzle | null {
  if (language === 'auto') {
    return null
  }

  const trimmed = prompt.trim()
  const key = QUICK_EXAMPLES.find((example) => example === trimmed)
  if (!key) {
    return null
  }

  return BY_PROMPT[key][language]
}

