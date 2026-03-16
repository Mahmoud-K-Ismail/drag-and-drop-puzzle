import { create } from 'zustand'

export type PuzzleLine = {
  id: string
  code: string
  explanation: string
  targetLine: number
  targetIndent: number
}

type PuzzleState = {
  lines: PuzzleLine[]
  isLoading: boolean
  setLines: (lines: PuzzleLine[]) => void
  setLoading: (isLoading: boolean) => void
}

export const usePuzzleStore = create<PuzzleState>((set) => ({
  lines: [],
  isLoading: false,
  setLines: (lines) => set({ lines }),
  setLoading: (isLoading) => set({ isLoading }),
}))
