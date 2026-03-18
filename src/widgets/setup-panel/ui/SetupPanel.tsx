import { useMemo } from 'react'
import { type SupportedLanguage, useSetupStore } from '../../../features/setup/model/setup.store'
import { usePuzzleStore } from '../../../features/puzzle/model/puzzle.store'
import { generatePuzzle } from '../../../shared/api/openai/generatePuzzle'
import styles from './SetupPanel.module.css'

const examples = [
  'Write a function that uses a while loop to generate a fibonacci sequence.',
  'Write a function that checks if a string is a palindrome.',
  'Write a function that returns the factorial of a number using recursion.',
]

const languages = [
  { value: 'auto', label: 'Auto-detect from prompt' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
] as const

export function SetupPanel() {
  const {
    apiKey,
    prompt,
    selectedExample,
    selectedLanguage,
    setApiKey,
    setPrompt,
    setSelectedExample,
    setSelectedLanguage,
  } = useSetupStore()
  const { setLines, isLoading, setLoading, error, setError } = usePuzzleStore()

  const selectedValue = useMemo(() => (selectedExample.length > 0 ? selectedExample : ''), [selectedExample])

  async function handleGenerate() {
    try {
      setError(null)
      setLoading(true)
      const puzzle = await generatePuzzle({
        apiKey,
        prompt,
        language: selectedLanguage,
      })
      setLines(puzzle.lines, puzzle.language)
    } catch (generationError) {
      const message = generationError instanceof Error ? generationError.message : 'Failed to generate puzzle.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function handleExampleChange(value: string) {
    if (prompt.trim().length > 0 && prompt !== value) {
      const confirmed = window.confirm('Replace current prompt with selected example?')
      if (!confirmed) {
        return
      }
    }

    setSelectedExample(value)
    setPrompt(value)
  }

  return (
    <aside className={styles.panel}>
      <h1 className={styles.title}>AI Code Puzzle</h1>
      <p className={styles.subtitle}>Generate code, then reconstruct it by drag-and-drop.</p>

      <label className={styles.label}>
        OpenAI API Key
        <input
          className={styles.input}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="sk-..."
        />
      </label>

      <label className={styles.label}>
        Programming Task
        <textarea
          className={styles.textarea}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the programming task"
        />
      </label>

      <label className={styles.label}>
        Output Language
        <select
          className={styles.select}
          value={selectedLanguage}
          onChange={(event) => setSelectedLanguage(event.target.value as SupportedLanguage)}
        >
          {languages.map((language) => (
            <option key={language.value} value={language.value}>
              {language.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.label}>
        Quick Examples
        <select
          className={styles.select}
          value={selectedValue}
          onChange={(event) => handleExampleChange(event.target.value)}
        >
          <option value="">Select an example...</option>
          {examples.map((example) => (
            <option key={example} value={example}>
              {example}
            </option>
          ))}
        </select>
      </label>

      <button
        className={styles.button}
        type="button"
        disabled={isLoading || apiKey.trim().length === 0 || prompt.trim().length === 0}
        onClick={handleGenerate}
      >
        {isLoading ? 'Generating...' : 'Generate Puzzle'}
      </button>

      {error ? <p className={styles.errorText}>{error}</p> : null}
    </aside>
  )
}
