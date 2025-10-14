/*
 * Idle task queue tuned for buttery boot: runs one job per idle frame, never
 * blocking foreground interactions, and keeps lightweight instrumentation so
 * we can trace backlog growth.
 */

import { InteractionManager } from 'react-native'

export type IdleTask = () => void | Promise<void>

export type IdleTaskHandle = {
  cancel: () => void
}

type QueueEntry = {
  id: number
  task: IdleTask
  label?: string
  enqueuedAt: number
  cancelled: boolean
}

export type IdleQueueStats = {
  pending: number
  running: boolean
  lastLabel?: string
  lastDuration: number
  averageDuration: number
  totalCompleted: number
}

const queue: QueueEntry[] = []
let nextId = 1
let scheduled = false
let running = false
let lastLabel: string | undefined
let lastDuration = 0
let totalCompleted = 0
let totalDuration = 0

let idleContextDepth = 0

const enterIdleContext = () => {
  idleContextDepth += 1
}

const exitIdleContext = () => {
  idleContextDepth = Math.max(0, idleContextDepth - 1)
}

export const isIdleTaskContext = () => idleContextDepth > 0

const DELAY_BETWEEN_JOBS_MS = 12
const FALLBACK_DELAY_MS = 240

const flushNext = () => {
  if (running || queue.length === 0) {
    running = false
    scheduled = false
    return
  }

  const entry = queue.shift()!
  if (entry.cancelled) {
    setTimeout(() => schedule(), DELAY_BETWEEN_JOBS_MS)
    return
  }

  running = true

  const execute = () => {
    const started = Date.now()
    let finished = false

    const finalize = () => {
      if (finished) return
      finished = true
      exitIdleContext()
      const duration = Date.now() - started
      lastDuration = duration
      lastLabel = entry.label
      totalCompleted += 1
      totalDuration += duration
      running = false
      scheduled = false
      if (__DEV__ && duration > 50) {
        console.log('[idleQueue] job completed', entry.label, `${duration}ms`)
      }
      if (queue.length) {
        setTimeout(() => schedule(), DELAY_BETWEEN_JOBS_MS)
      } else if (__DEV__) {
        console.log('[boot-trace] idleQueue:drained', {
          completed: totalCompleted,
          averageDuration: totalCompleted === 0 ? 0 : Math.round((totalDuration / totalCompleted) * 100) / 100,
        })
      }
    }

    try {
      if (__DEV__) {
        console.log('[idleQueue] job start', { id: entry.id, label: entry.label })
      }
      enterIdleContext()
      const result = entry.task()
      if (result && typeof (result as Promise<void>).then === 'function') {
        ;(result as Promise<void>)
          .then(finalize)
          .catch((error) => {
            console.warn('[idleQueue] task failed', error)
            finalize()
          })
      } else {
        finalize()
      }
    } catch (error) {
      console.warn('[idleQueue] task failed', error)
      finalize()
    }
  }

  execute()
}

const schedule = () => {
  if (scheduled || running || queue.length === 0) {
    return
  }

  scheduled = true
  let cancelled = false

  const nextPending = queue.find((entry) => !entry.cancelled)
  const interactionMeta = {
    pending: queue.length,
    nextLabel: nextPending?.label,
  }

  const fallback = setTimeout(() => {
    if (cancelled) return
    if (__DEV__) {
      console.log('[idleQueue] fallbackTick', interactionMeta)
    }
    scheduled = false
    flushNext()
  }, FALLBACK_DELAY_MS)

  const interactionCallback = () => {
    if (cancelled) return
    cancelled = true
    clearTimeout(fallback)
    scheduled = false
    flushNext()
  }
  ;(interactionCallback as any).__interactionLabel = nextPending?.label
    ? `idleQueue:${nextPending.label}`
    : 'idleQueue:flushNext'
  ;(interactionCallback as any).__interactionMeta = interactionMeta

  InteractionManager.runAfterInteractions(interactionCallback)
}

export const enqueueIdleTask = (task: IdleTask, label?: string): IdleTaskHandle => {
  const entryId = nextId++
  const entryLabel = label ?? `idle:${entryId}`
  const entry: QueueEntry = {
    id: entryId,
    task,
    label: entryLabel,
    enqueuedAt: Date.now(),
    cancelled: false,
  }

  queue.push(entry)
  if (__DEV__) {
    console.log('[idleQueue] enqueue', {
      id: entryId,
      label: entryLabel,
      pending: queue.length,
    })
  }
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
  queue.length = 0
  scheduled = false
  running = false
}

export const getIdleQueueStats = (): IdleQueueStats => {
  const averageDuration = totalCompleted === 0 ? 0 : totalDuration / totalCompleted

  return {
    pending: queue.filter((entry) => !entry.cancelled).length + (running ? 1 : 0),
    running,
    lastLabel,
    lastDuration,
    averageDuration,
    totalCompleted,
  }
}
