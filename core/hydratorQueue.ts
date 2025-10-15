import { InteractionManager } from 'react-native'

type HydratorJob = {
  key: string
  label?: string
  priority?: number
  run: () => Promise<void> | void
}

const MAX_CONCURRENCY = 1
const MAX_QUEUE_SIZE = 24

const queue: HydratorJob[] = []
const activeKeys = new Set<string>()
const scheduledKeys = new Set<string>()

let running = 0
let schedulerPending = false

export function enqueueHydratorJob(job: HydratorJob): void {
  if (!job?.key) {
    return
  }

  if (activeKeys.has(job.key) || scheduledKeys.has(job.key)) {
    return
  }

  scheduledKeys.add(job.key)
  queue.push(job)
  queue.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

  if (queue.length > MAX_QUEUE_SIZE) {
    const dropped = queue.pop()
    if (dropped) {
      scheduledKeys.delete(dropped.key)
      if (__DEV__) {
        console.log('[hydrator] dropped job', dropped.label ?? dropped.key)
      }
    }
  }

  schedule()
}

export function clearHydratorQueue(): void {
  queue.length = 0
  scheduledKeys.clear()
}

function schedule() {
  if (schedulerPending) return
  schedulerPending = true

  const nextLabel = queue[0]?.label ?? queue[0]?.key
  const interactionCallback = () => {
    schedulerPending = false
    drain()
  }
  ;(interactionCallback as any).__interactionLabel = nextLabel
    ? `hydrator:${nextLabel}`
    : 'hydrator:drain'
  ;(interactionCallback as any).__interactionMeta = {
    pending: queue.length,
    running,
  }

  InteractionManager.runAfterInteractions(interactionCallback)
}

function drain() {
  if (!queue.length || running >= MAX_CONCURRENCY) {
    return
  }

  const next = queue.shift()
  if (!next) return

  scheduledKeys.delete(next.key)
  activeKeys.add(next.key)
  running += 1

  const startedAt = Date.now()
  const label = next.label ?? next.key

  const finalize = () => {
    activeKeys.delete(next.key)
    running = Math.max(0, running - 1)
    if (__DEV__) {
      const duration = Date.now() - startedAt
      console.log('[hydrator] job complete', label, `${duration}ms`)
    }
    if (queue.length) {
      schedule()
    }
  }

  try {
    if (__DEV__) {
      console.log('[hydrator] job start', label)
    }
    const result = next.run()
    if (result && typeof (result as Promise<void>).then === 'function') {
      ;(result as Promise<void>)
        .then(finalize)
        .catch((error) => {
          console.warn('[hydrator] job failed', label, error)
          finalize()
        })
    } else {
      finalize()
    }
  } catch (error) {
    console.warn('[hydrator] job crashed', label, error)
    finalize()
  }
}
