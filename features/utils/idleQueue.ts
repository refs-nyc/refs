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
  priority: 'high' | 'low'
}

export type IdleQueueStats = {
  pending: number
  running: boolean
  lastLabel?: string
  lastDuration: number
  averageDuration: number
  totalCompleted: number
}

const highQueue: QueueEntry[] = []
const lowQueue: QueueEntry[] = []
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
const MAX_PENDING_JOBS = 12
const AVG_DURATION_BUDGET_MS = 8
const LONG_TASK_WARN_MS = 300

const getQueues = () => ({
  high: highQueue,
  low: lowQueue,
})

const pendingCount = () =>
  highQueue.filter((entry) => !entry.cancelled).length + lowQueue.filter((entry) => !entry.cancelled).length

const totalPending = () => pendingCount() + (running ? 1 : 0)

const shiftNextEntry = (): QueueEntry | undefined => {
  while (highQueue.length) {
    const candidate = highQueue.shift()
    if (!candidate?.cancelled) {
      return candidate
    }
  }
  while (lowQueue.length) {
    const candidate = lowQueue.shift()
    if (!candidate?.cancelled) {
      return candidate
    }
  }
  return undefined
}

const peekNextEntry = (): QueueEntry | undefined => {
  const high = highQueue.find((entry) => !entry.cancelled)
  if (high) return high
  return lowQueue.find((entry) => !entry.cancelled)
}

const flushNext = () => {
  if (running) {
    return
  }

  const entry = shiftNextEntry()
  if (!entry) {
    running = false
    scheduled = false
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
      if (__DEV__ && duration >= LONG_TASK_WARN_MS) {
        console.warn('[idleQueue] job long', entry.label, `${duration}ms`)
      } else if (__DEV__ && duration > 0 && duration > AVG_DURATION_BUDGET_MS * 2) {
        console.log('[idleQueue] job completed', entry.label, `${duration}ms`)
      }
      const pending = pendingCount()
      if (__DEV__ && totalCompleted && totalDuration / totalCompleted > AVG_DURATION_BUDGET_MS) {
        console.warn('[idleQueue] average duration drift', {
          average: totalDuration / totalCompleted,
          totalCompleted,
        })
      }
      if (pending > 0) {
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
            console.warn('[idleQueue] task failed', entry.label, error)
            finalize()
          })
      } else {
        finalize()
      }
    } catch (error) {
      console.warn('[idleQueue] task failed', entry.label, error)
      finalize()
    }
  }

  execute()
}

const schedule = () => {
  if (scheduled || running) {
    return
  }
  const nextPending = peekNextEntry()
  if (!nextPending) {
    scheduled = false
    return
  }

  scheduled = true
  let cancelled = false

  const interactionMeta = {
    pending: pendingCount(),
    nextLabel: nextPending?.label,
    nextPriority: nextPending?.priority,
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

type EnqueueOptions =
  | string
  | {
      label?: string
      priority?: 'high' | 'low'
    }

export const enqueueIdleTask = (task: IdleTask, options?: EnqueueOptions): IdleTaskHandle => {
  const entryId = nextId++
  const resolved =
    typeof options === 'string'
      ? { label: options, priority: 'low' as const }
      : {
          label: options?.label,
          priority: options?.priority ?? 'low',
        }

  const entryLabel = resolved.label ?? `idle:${entryId}`
  const entry: QueueEntry = {
    id: entryId,
    task,
    label: entryLabel,
    enqueuedAt: Date.now(),
    cancelled: false,
    priority: resolved.priority,
  }

  const targetQueue = resolved.priority === 'high' ? highQueue : lowQueue
  targetQueue.push(entry)

  const waiting = pendingCount()
  if (waiting > MAX_PENDING_JOBS) {
    const queues = getQueues()
    const candidate =
      queues.low.find((item) => item !== entry && !item.cancelled) ??
      queues.high.find((item) => item !== entry && !item.cancelled)
    if (candidate) {
      candidate.cancelled = true
      const source = candidate.priority === 'high' ? highQueue : lowQueue
      const index = source.indexOf(candidate)
      if (index >= 0) {
        source.splice(index, 1)
      }
      if (__DEV__) {
        console.warn('[idleQueue] dropping pending job', {
          dropped: candidate.label,
          priority: candidate.priority,
          reason: 'max-pending',
        })
      }
    } else if (resolved.priority === 'low') {
      entry.cancelled = true
      const source = resolved.priority === 'high' ? highQueue : lowQueue
      const index = source.indexOf(entry)
      if (index >= 0) {
        source.splice(index, 1)
      }
      if (__DEV__) {
        console.warn('[idleQueue] rejected low-priority job', entry.label)
      }
      return {
        cancel: () => {
          entry.cancelled = true
        },
      }
    }
  }

  if (__DEV__) {
    console.log('[idleQueue] enqueue', {
      id: entryId,
      label: entryLabel,
      priority: resolved.priority,
      pending: totalPending(),
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
  highQueue.forEach((entry) => {
    entry.cancelled = true
  })
  lowQueue.forEach((entry) => {
    entry.cancelled = true
  })
  highQueue.length = 0
  lowQueue.length = 0
  scheduled = false
  running = false
}

export const getIdleQueueStats = (): IdleQueueStats => {
  const averageDuration = totalCompleted === 0 ? 0 : totalDuration / totalCompleted

  return {
    pending:
      highQueue.filter((entry) => !entry.cancelled).length +
      lowQueue.filter((entry) => !entry.cancelled).length +
      (running ? 1 : 0),
    running,
    lastLabel,
    lastDuration,
    averageDuration,
    totalCompleted,
  }
}
