import Editor from '@monaco-editor/react'
import { usePuzzleStore } from '../../../features/puzzle/model/puzzle.store'
import styles from './PuzzleBoard.module.css'

export function PuzzleBoard() {
  const lines = usePuzzleStore((state) => state.lines)

  if (lines.length === 0) {
    return <div className={styles.empty}>Generated code blocks will appear here.</div>
  }

  return (
    <section className={styles.board}>
      {lines.map((line) => (
        <article key={line.id} className={styles.card}>
          <Editor
            height="56px"
            defaultLanguage="javascript"
            value={line.code}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              lineNumbers: 'off',
              glyphMargin: false,
              folding: false,
              scrollBeyondLastLine: false,
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              scrollbar: {
                vertical: 'hidden',
                horizontal: 'hidden',
              },
            }}
          />
        </article>
      ))}
    </section>
  )
}
