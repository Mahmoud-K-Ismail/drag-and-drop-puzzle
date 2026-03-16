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
        <PuzzleBoard />
      </section>
    </main>
  )
}
