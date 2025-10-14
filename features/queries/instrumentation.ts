export type TimingSample = {
  label: string
  startedAt: number
  finishedAt: number
  duration: number
}

const samples: TimingSample[] = []

export function withTiming<T>(label: string, task: () => Promise<T> | T): Promise<T> {
  const startedAt = Date.now()
  const onFinish = (result: T) => {
    const finishedAt = Date.now()
    samples.push({
      label,
      startedAt,
      finishedAt,
      duration: finishedAt - startedAt,
    })
    return result
  }

  try {
    const value = task()
    if (value instanceof Promise) {
      return value.then((result) => onFinish(result))
    }
    return Promise.resolve(onFinish(value))
  } catch (error) {
    const finishedAt = Date.now()
    samples.push({ label: `${label} (error)`, startedAt, finishedAt, duration: finishedAt - startedAt })
    return Promise.reject(error)
  }
}

export function clearTimingSamples() {
  samples.length = 0
}

export function getTimingReport() {
  return [...samples]
}
