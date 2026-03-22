import { useEffect, useMemo, useState } from 'react'
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

const loadingMessages = [
  'Connecting to model...',
  'Generating code and line-by-line explanations...',
  'Preparing draggable puzzle blocks...',
]

export function SetupPanel() {
  const {
    apiKey,
    prompt,
    selectedExample,
    selectedLanguage,
    generationLayoutMode,
    setApiKey,
    setPrompt,
    setSelectedExample,
    setSelectedLanguage,
    setGenerationLayoutMode,
  } = useSetupStore()
  const { setLines, isLoading, setLoading, error, setError, setStarted } = usePuzzleStore()
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)

  const selectedValue = useMemo(() => (selectedExample.length > 0 ? selectedExample : ''), [selectedExample])

  useEffect(() => {
    if (!isLoading) {
      setLoadingMessageIndex(0)
      return
    }

    const interval = window.setInterval(() => {
      setLoadingMessageIndex((current) => (current + 1) % loadingMessages.length)
    }, 1200)

    return () => window.clearInterval(interval)
  }, [isLoading])

  async function handleGenerate() {
    try {
      setStarted(true)
      setError(null)
      setLoading(true)
      const puzzle = await generatePuzzle({
        apiKey,
        prompt,
        language: selectedLanguage,
      })
      setLines(puzzle.lines, puzzle.language, generationLayoutMode)
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

      <div className={styles.layoutSwitchRow}>
        <span className={styles.layoutSwitchLabel} id="layout-mode-label">
          After generate, play as
        </span>
        <div
          className={styles.layoutSwitch}
          role="group"
          aria-labelledby="layout-mode-label"
        >
          <button
            type="button"
            className={`${styles.layoutSwitchOption} ${generationLayoutMode === 'puzzle' ? styles.layoutSwitchOptionActive : ''}`}
            aria-pressed={generationLayoutMode === 'puzzle'}
            onClick={() => setGenerationLayoutMode('puzzle')}
          >
            Two-lane puzzle
          </button>
          <button
            type="button"
            className={`${styles.layoutSwitchOption} ${generationLayoutMode === 'ordering' ? styles.layoutSwitchOptionActive : ''}`}
            aria-pressed={generationLayoutMode === 'ordering'}
            onClick={() => setGenerationLayoutMode('ordering')}
          >
            Order list
          </button>
        </div>
        <p className={styles.layoutSwitchHint}>
          {generationLayoutMode === 'puzzle'
            ? 'Code bank + solution slots (drag between columns).'
            : 'One shuffled list — reorder lines and set indent with − / +.'}
        </p>
      </div>

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

      {isLoading ? <p className={styles.statusText}>{loadingMessages[loadingMessageIndex]}</p> : null}

      {error ? <p className={styles.errorText}>{error}</p> : null}
    </aside>
  )
}
