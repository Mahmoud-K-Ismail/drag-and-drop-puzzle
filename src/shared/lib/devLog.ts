/**
 * Dev-only console helpers. Stripped from typical production mindset: `import.meta.env.DEV` is false in `vite build`.
 * Use scopes like `[setup]`, `[api]`, `[puzzle]` so you can filter in DevTools.
 */
export function devLog(scope: string, ...args: unknown[]): void {
  if (!import.meta.env.DEV) {
    return
  }
  console.log(`[${scope}]`, ...args)
}

export function devWarn(scope: string, ...args: unknown[]): void {
  if (!import.meta.env.DEV) {
    return
  }
  console.warn(`[${scope}]`, ...args)
}
