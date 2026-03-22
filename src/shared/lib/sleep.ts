/** Browser-only delay (e.g. minimum loading UX). */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
