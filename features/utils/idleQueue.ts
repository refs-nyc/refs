/*
 * Idle task queue tuned for buttery boot: runs one job per idle frame, never
 * blocking foreground interactions, and keeps lightweight instrumentation so
 * we can trace backlog growth.
 */

import { InteractionManager } from 'react-native'

let gateAccessor: (() => boolean) | null = null
const isGateActive = () => {
  if (!gateAccessor) {
    try {
      const { useAppStore } = require('@/features/stores')
      gateAccessor = () => useAppStore.getState().interactionGateActive
    } catch {
      gateAccessor = () => false
    }
  }
  return gateAccessor()
}

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
let runningCount = 0
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

const totalPendingWithRunning = () => pendingCount() + runningCount

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

const MAX_CONCURRENCY = 2
const MAX_JOBS_PER_TICK = 2

const logDrainIfIdle = () => {
  if (__DEV__ && runningCount === 0 && !peekNextEntry()) {
    console.log('[boot-trace] idleQueue:drained', {
      completed: totalCompleted,
      averageDuration: totalCompleted === 0 ? 0 : Math.round((totalDuration / totalCompleted) * 100) / 100,
    })
  }
}

const runEntry = (entry: QueueEntry) => {
  runningCount += 1
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
    runningCount = Math.max(0, runningCount - 1)
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
      schedule()
    } else {
      logDrainIfIdle()
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

const drainQueue = () => {
  let launched = 0
  while (runningCount < MAX_CONCURRENCY && launched < MAX_JOBS_PER_TICK) {
    const entry = shiftNextEntry()
    if (!entry) break
    launched += 1
    runEntry(entry)
  }
  if (peekNextEntry() && runningCount < MAX_CONCURRENCY) {
    schedule()
  }
}

const schedule = () => {
  if (scheduled || (!peekNextEntry() && runningCount === 0)) {
    return
  }

  scheduled = true
  let cancelled = false

  const fallback = setTimeout(() => {
    if (cancelled) return
    cancelled = true
    scheduled = false
    drainQueue()
  }, FALLBACK_DELAY_MS)

  const interactionCallback = () => {
    if (cancelled) return
    cancelled = true
    clearTimeout(fallback)
    scheduled = false
    drainQueue()
  }

  InteractionManager.runAfterInteractions(interactionCallback)
}

type EnqueueOptions =
  | string
  | {
      label?: string
      priority?: 'high' | 'low'
    }

export const enqueueIdleTask = (task: IdleTask, options?: EnqueueOptions): IdleTaskHandle => {
  const resolved =
    typeof options === 'string'
      ? { label: options, priority: 'low' as const }
      : {
          label: options?.label,
          priority: options?.priority ?? 'low',
        }

  if (isGateActive() && resolved.priority === 'low') {
    const timeoutId = setTimeout(() => {
      enqueueIdleTask(task, options)
    }, 160)
    return {
      cancel: () => {
        clearTimeout(timeoutId)
      },
    }
  }

  const entryId = nextId++

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
      const index = lowQueue.indexOf(entry)
      if (index >= 0) {
        lowQueue.splice(index, 1)
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
      pending: totalPendingWithRunning(),
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
  runningCount = 0
}

export const getIdleQueueStats = (): IdleQueueStats => {
  const averageDuration = totalCompleted === 0 ? 0 : totalDuration / totalCompleted

  return {
    pending: totalPendingWithRunning(),
    running: runningCount > 0,
    lastLabel,
    lastDuration,
    averageDuration,
    totalCompleted,
  }
}
