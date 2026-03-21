import { loader } from '@monaco-editor/react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let monacoInstance: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let initPromise: Promise<any> | null = null

function getMonaco() {
  if (monacoInstance) return Promise.resolve(monacoInstance)
  if (initPromise) return initPromise

  initPromise = loader.init().then((monaco) => {
    monaco.editor.defineTheme('puzzle-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '1f4bd8', fontStyle: 'bold' },
        { token: 'type', foreground: '1f4bd8', fontStyle: 'bold' },
        { token: 'string', foreground: 'bb2d2d' },
        { token: 'string.escape', foreground: 'bb2d2d' },
        { token: 'number', foreground: '0f766e' },
        { token: 'number.float', foreground: '0f766e' },
        { token: 'comment', foreground: '5f6d84', fontStyle: 'italic' },
        { token: 'delimiter', foreground: '2b3348' },
        { token: 'delimiter.parenthesis', foreground: '2b3348' },
        { token: 'delimiter.bracket', foreground: '2b3348' },
        { token: 'operator', foreground: '2b3348' },
        { token: 'identifier', foreground: '3a4f8a' },
        { token: 'variable', foreground: '3a4f8a' },
      ],
      colors: {
        'editor.foreground': '#1d2538',
        'editor.background': '#00000000',
      },
    })
    monaco.editor.setTheme('puzzle-light')
    monacoInstance = monaco
    return monaco
  })

  return initPromise
}

export const colorizeCache = new Map<string, string>()

export function colorize(code: string, lang: string): Promise<string> {
  const key = `${lang}:${code}`
  const cached = colorizeCache.get(key)
  if (cached) return Promise.resolve(cached)

  return getMonaco().then((monaco) =>
    monaco!.editor.colorize(code, lang, { tabSize: 2 }).then((html: string) => {
      colorizeCache.set(key, html)
      return html
    }),
  )
}

export function toMonacoLanguage(language: string) {
  switch (language.toLowerCase()) {
    case 'c++':
      return 'cpp'
    default:
      return language.toLowerCase()
  }
}

export function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
