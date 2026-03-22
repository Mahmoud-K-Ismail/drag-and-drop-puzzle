import { SetupPanel } from '../../../widgets/setup-panel/ui/SetupPanel'
import { OrderingBoard } from '../../../widgets/ordering-board/ui/OrderingBoard'
import { PuzzleBoard } from '../../../widgets/puzzle-board/ui/PuzzleBoard'
import { usePuzzleStore } from '../../../features/puzzle/model/puzzle.store'
import styles from './PlaygroundPage.module.css'

export function PlaygroundPage() {
  const hasStarted = usePuzzleStore((state) => state.hasStarted)
  const lines = usePuzzleStore((state) => state.lines)
  const isLoading = usePuzzleStore((state) => state.isLoading)
  const layoutMode = usePuzzleStore((state) => state.layoutMode)

  const stageClass = hasStarted || isLoading || lines.length > 0 ? styles.active : styles.initial

  return (
    <main className={`${styles.page} ${stageClass}`}>
      <section className={styles.leftPane}>
        <SetupPanel />
      </section>
      <section className={styles.rightPane}>
        <header className={styles.boardHeader}>
          <p className={styles.kicker}>Puzzle Workspace</p>
          <h2 className={styles.boardTitle}>Rebuild the generated solution</h2>
          <p className={styles.boardSubtitle}>
            {layoutMode === 'ordering'
              ? 'Reorder the shuffled lines and match indentation. Use − / +, undo/redo, and hints in the toolbar.'
              : 'Drag blocks from the bank into slots to match line order and indentation depth.'}
          </p>
        </header>
        {layoutMode === 'ordering' ? <OrderingBoard /> : <PuzzleBoard />}
      </section>
    </main>
  )
}
