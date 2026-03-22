import { create } from 'zustand'
import type { SupportedLanguage } from '../../../shared/config/outputLanguages'
import { readApiKeyFromStorage, writeApiKeyToStorage } from '../../../shared/lib/localStorage'

export type { SupportedLanguage }

/** Chosen before Generate; applied when the puzzle is created. */
export type GenerationLayoutMode = 'puzzle' | 'ordering'

type SetupState = {
  apiKey: string
  prompt: string
  selectedExample: string
  selectedLanguage: SupportedLanguage
  generationLayoutMode: GenerationLayoutMode
  setApiKey: (apiKey: string) => void
  setPrompt: (prompt: string) => void
  setSelectedExample: (value: string) => void
  setSelectedLanguage: (language: SupportedLanguage) => void
  setGenerationLayoutMode: (mode: GenerationLayoutMode) => void
}

export const useSetupStore = create<SetupState>((set) => ({
  apiKey: readApiKeyFromStorage(),
  prompt: '',
  selectedExample: '',
  selectedLanguage: 'auto',
  generationLayoutMode: 'puzzle',
  setApiKey: (apiKey) => {
    writeApiKeyToStorage(apiKey)
    set({ apiKey })
  },
  setPrompt: (prompt) => set({ prompt }),
  setSelectedExample: (selectedExample) => set({ selectedExample }),
  setSelectedLanguage: (selectedLanguage) => set({ selectedLanguage }),
  setGenerationLayoutMode: (generationLayoutMode) => set({ generationLayoutMode }),
}))
