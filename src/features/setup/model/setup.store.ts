import { create } from 'zustand'
import { readApiKeyFromStorage, writeApiKeyToStorage } from '../../../shared/lib/localStorage'

type SetupState = {
  apiKey: string
  prompt: string
  selectedExample: string
  setApiKey: (apiKey: string) => void
  setPrompt: (prompt: string) => void
  setSelectedExample: (value: string) => void
}

export const useSetupStore = create<SetupState>((set) => ({
  apiKey: readApiKeyFromStorage(),
  prompt: '',
  selectedExample: '',
  setApiKey: (apiKey) => {
    writeApiKeyToStorage(apiKey)
    set({ apiKey })
  },
  setPrompt: (prompt) => set({ prompt }),
  setSelectedExample: (selectedExample) => set({ selectedExample }),
}))
