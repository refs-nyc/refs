const shouldLog =
  __DEV__ ||
  process.env.EXPO_PUBLIC_PERF_HARNESS === '1' ||
  process.env.EXPO_PUBLIC_PERF_VERBOSE === '1'

export const startInteraction = (label: string, meta?: unknown) => {
  if (!shouldLog) return 0
  // eslint-disable-next-line no-console
  console.log(`[perf:mark] ${label}:start`, meta ?? '')
  return Date.now()
}

export const endInteraction = (label: string, startedAt?: number, meta?: unknown) => {
  if (!shouldLog) return
  const dt = startedAt ? Date.now() - startedAt : 0
  // eslint-disable-next-line no-console
  console.log(`[perf:done] ${label}`, dt, meta ?? '')
}

export const mark = (label: string, meta?: unknown) => {
  if (!shouldLog) return
  // eslint-disable-next-line no-console
  console.log(`[perf:mark] ${label}`, meta ?? '')
}

export const withInteraction = <T extends (...args: any[]) => any>(label: string, fn: T): T => {
  return ((...args: any[]) => {
    const startedAt = startInteraction(label)
    try {
      return fn(...args)
    } finally {
      endInteraction(label, startedAt)
    }
  }) as T
}
