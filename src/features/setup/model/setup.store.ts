import { create } from 'zustand'
import { readApiKeyFromStorage, writeApiKeyToStorage } from '../../../shared/lib/localStorage'

export type SupportedLanguage = 'auto' | 'javascript' | 'typescript' | 'python' | 'java' | 'cpp'

type SetupState = {
  apiKey: string
  prompt: string
  selectedExample: string
  selectedLanguage: SupportedLanguage
  setApiKey: (apiKey: string) => void
  setPrompt: (prompt: string) => void
  setSelectedExample: (value: string) => void
  setSelectedLanguage: (language: SupportedLanguage) => void
}

export const useSetupStore = create<SetupState>((set) => ({
  apiKey: readApiKeyFromStorage(),
  prompt: '',
  selectedExample: '',
  selectedLanguage: 'auto',
  setApiKey: (apiKey) => {
    writeApiKeyToStorage(apiKey)
    set({ apiKey })
  },
  setPrompt: (prompt) => set({ prompt }),
  setSelectedExample: (selectedExample) => set({ selectedExample }),
  setSelectedLanguage: (selectedLanguage) => set({ selectedLanguage }),
}))
