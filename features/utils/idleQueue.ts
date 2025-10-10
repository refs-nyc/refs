/*
 * Lightweight idle task queue for React Native / browsers.
 * Runs queued tasks one at a time when the JS thread is idle (or after a short timeout).
 */

export type IdleTask = () => void | Promise<void>

interface QueueEntry {
  id: number
  task: IdleTask
  cancelled: boolean
}

export interface IdleTaskHandle {
  cancel: () => void
}

let queue: QueueEntry[] = []
let isRunning = false
let currentHandle: number | null = null
let nextId = 1

const hasRequestIdleCallback = typeof globalThis.requestIdleCallback === 'function'

const schedule = () => {
  if (queue.length === 0 || isRunning || currentHandle !== null) {
    return
  }

  const callback = () => {
    currentHandle = null
    runNext()
  }

  if (hasRequestIdleCallback && typeof globalThis.requestIdleCallback === 'function') {
    currentHandle = globalThis.requestIdleCallback(callback, { timeout: 60 })
  } else {
    currentHandle = setTimeout(callback, 32) as unknown as number
  }
}

const runNext = () => {
  while (queue.length > 0) {
    const entry = queue.shift()!
    if (entry.cancelled) {
      continue
    }

    isRunning = true

    const finish = () => {
      isRunning = false
      schedule()
    }

    try {
      const result = entry.task()
      if (result && typeof (result as Promise<void>).then === 'function') {
        ;(result as Promise<void>).then(finish).catch((error) => {
          console.warn('[idleQueue] task failed', error)
          finish()
        })
      } else {
        finish()
      }
    } catch (error) {
      console.warn('[idleQueue] task failed', error)
      finish()
    }

    return
  }
}

export const enqueueIdleTask = (task: IdleTask): IdleTaskHandle => {
  const entry: QueueEntry = {
    id: nextId++,
    task,
    cancelled: false,
  }

  queue.push(entry)
  schedule()

  return {
    cancel: () => {
      entry.cancelled = true
    },
  }
}

export const clearIdleQueue = () => {
  queue.forEach((entry) => {
    entry.cancelled = true
  })
  queue = []
  if (currentHandle != null) {
    if (hasRequestIdleCallback && typeof globalThis.cancelIdleCallback === 'function') {
      globalThis.cancelIdleCallback(currentHandle)
    } else {
      clearTimeout(currentHandle)
    }
    currentHandle = null
  }
  isRunning = false
}
