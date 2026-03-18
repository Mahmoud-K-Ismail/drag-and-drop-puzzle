import { SetupPanel } from '../../../widgets/setup-panel/ui/SetupPanel'
import { PuzzleBoard } from '../../../widgets/puzzle-board/ui/PuzzleBoard'
import styles from './PlaygroundPage.module.css'

export function PlaygroundPage() {
  return (
    <main className={styles.page}>
      <section className={styles.leftPane}>
        <SetupPanel />
      </section>
      <section className={styles.rightPane}>
        <header className={styles.boardHeader}>
          <p className={styles.kicker}>Puzzle Workspace</p>
          <h2 className={styles.boardTitle}>Rebuild the generated solution</h2>
          <p className={styles.boardSubtitle}>
            Drag blocks to match both the correct line order and indentation depth.
          </p>
        </header>
        <PuzzleBoard />
      </section>
    </main>
  )
}
