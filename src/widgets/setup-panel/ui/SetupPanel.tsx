import { useMemo } from 'react'
import { useSetupStore } from '../../../features/setup/model/setup.store'
import { usePuzzleStore } from '../../../features/puzzle/model/puzzle.store'
import { generatePuzzle } from '../../../shared/api/openai/generatePuzzle'
import styles from './SetupPanel.module.css'

const examples = [
  'Write a function that uses a while loop to generate a fibonacci sequence.',
  'Write a function that checks if a string is a palindrome.',
  'Write a function that returns the factorial of a number using recursion.',
]

export function SetupPanel() {
  const { apiKey, prompt, selectedExample, setApiKey, setPrompt, setSelectedExample } = useSetupStore()
  const { setLines, isLoading, setLoading } = usePuzzleStore()

  const selectedValue = useMemo(() => (selectedExample.length > 0 ? selectedExample : ''), [selectedExample])

  async function handleGenerate() {
    try {
      setLoading(true)
      const puzzle = await generatePuzzle({ apiKey, prompt })
      setLines(puzzle.lines)
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
    </aside>
  )
}
