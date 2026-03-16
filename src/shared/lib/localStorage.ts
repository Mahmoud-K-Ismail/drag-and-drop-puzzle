const API_KEY_STORAGE_KEY = 'openai-api-key'

export function readApiKeyFromStorage() {
  return localStorage.getItem(API_KEY_STORAGE_KEY) ?? ''
}

export function writeApiKeyToStorage(apiKey: string) {
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey)
}
