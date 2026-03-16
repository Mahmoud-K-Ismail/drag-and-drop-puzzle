import { create } from 'zustand'

type Snapshot<T> = {
  past: T[]
  present: T | null
  future: T[]
}

type HistoryState<T> = {
  snapshot: Snapshot<T>
  push: (next: T) => void
  undo: () => T | null
  redo: () => T | null
  reset: () => void
}

const emptySnapshot = { past: [], present: null, future: [] }

export const useHistoryStore = create<HistoryState<unknown>>((set, get) => ({
  snapshot: emptySnapshot,
  push: (next) => {
    const { snapshot } = get()
    set({
      snapshot: {
        past: snapshot.present === null ? snapshot.past : [...snapshot.past, snapshot.present],
        present: next,
        future: [],
      },
    })
  },
  undo: () => {
    const { snapshot } = get()
    const previous = snapshot.past.at(-1)

    if (previous === undefined) {
      return snapshot.present
    }

    set({
      snapshot: {
        past: snapshot.past.slice(0, -1),
        present: previous,
        future: snapshot.present === null ? snapshot.future : [snapshot.present, ...snapshot.future],
      },
    })

    return previous
  },
  redo: () => {
    const { snapshot } = get()
    const next = snapshot.future[0]

    if (next === undefined) {
      return snapshot.present
    }

    set({
      snapshot: {
        past: snapshot.present === null ? snapshot.past : [...snapshot.past, snapshot.present],
        present: next,
        future: snapshot.future.slice(1),
      },
    })

    return next
  },
  reset: () => set({ snapshot: emptySnapshot }),
}))
