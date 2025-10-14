import { InteractionManager } from 'react-native'

type JsQueueMonitorOptions = {
  intervalMs?: number
  warnAtMs?: number
  label?: string
}

const defaultMonitorOptions: Required<JsQueueMonitorOptions> = {
  intervalMs: 100,
  warnAtMs: 200,
  label: 'boot-trace',
}

let monitorStarted = false
let interactionPatched = false

export const startJsQueueMonitor = (options: JsQueueMonitorOptions = {}) => {
  if (!__DEV__ || monitorStarted) return
  monitorStarted = true

  const { intervalMs, warnAtMs, label } = { ...defaultMonitorOptions, ...options }
  let lastTick = Date.now()

  const timer = setInterval(() => {
    const now = Date.now()
    const delta = now - lastTick
    const lag = delta - intervalMs
    if (lag > warnAtMs) {
      console.log(`[${label}] js-queue:lag`, {
        lag: Math.round(lag),
        interval: intervalMs,
        delta: Math.round(delta),
        timestamp: now,
      })
    }
    lastTick = now
  }, intervalMs)

  // Avoid keeping the app alive in environments that support unref
  const maybeUnref = (timer as unknown as { unref?: () => void }).unref
  if (typeof maybeUnref === 'function') {
    maybeUnref.call(timer)
  }
}

type InteractionPatchOptions = {
  waitWarnMs?: number
  runWarnMs?: number
  label?: string
}

const defaultInteractionOptions: Required<InteractionPatchOptions> = {
  waitWarnMs: 200,
  runWarnMs: 100,
  label: 'boot-trace',
}

const resolveModuleInfo = (stack?: string) => {
  if (!stack) return undefined
  const match = stack.match(/app:(\d+)/)
  if (!match) return undefined
  const id = Number(match[1])
  const metro = (global as any)?.__r
  try {
    const modules = metro?.getModules?.()
    const key = modules && typeof modules.get === 'function' ? modules.get(id) : undefined
    const mod = key ?? modules?.[id] ?? modules?.[String(id)]
    const verbose = mod?.verboseName || mod?.path || mod?.name
    if (verbose) {
      return { id, name: verbose }
    }
    if (__DEV__ && modules && !(resolveModuleInfo as any)._loggedMiss) {
      ;(resolveModuleInfo as any)._loggedMiss = true
      try {
        const keys = Array.isArray(modules)
          ? modules.slice(0, 5)
          : typeof modules === 'object'
          ? Object.keys(modules).slice(0, 5)
          : []
        console.log('[boot-trace] moduleName:miss', {
          id,
          keys,
          type: typeof modules,
        })
      } catch {}
    }
  } catch {}
  return { id, name: `module:${id}` }
}

export const patchInteractionManager = (options: InteractionPatchOptions = {}) => {
  if (!__DEV__ || interactionPatched) return
  interactionPatched = true

  const { waitWarnMs, runWarnMs, label: scopeLabel } = { ...defaultInteractionOptions, ...options }
  type RunAfterInteractions = typeof InteractionManager.runAfterInteractions
  const original = InteractionManager.runAfterInteractions.bind(InteractionManager) as RunAfterInteractions
  let counter = 0

  InteractionManager.runAfterInteractions = ((task?: Parameters<RunAfterInteractions>[0]) => {
    if (typeof task !== 'function') {
      return original(task)
    }

    const callback = task
    const id = ++counter
    const scheduledAt = Date.now()

    const scheduleStackLines = new Error()
      .stack?.split('\n')
      .slice(2, 3)
      .map((line) => line.trim())
    const scheduleStack = scheduleStackLines?.[0]

    const explicitLabel = (callback as any)?.__interactionLabel
    let interactionLabel =
      explicitLabel || callback?.name || (callback as any)?.displayName || 'anonymous'
    const interactionMeta = (callback as any)?.__interactionMeta
    const source = String(callback)

    const moduleInfo = resolveModuleInfo(scheduleStack)
    const moduleLabel = moduleInfo?.name
    if (interactionLabel === 'anonymous' && moduleLabel) {
      const parts = moduleLabel.split('/')
      const hint = parts.pop() || moduleLabel
      interactionLabel = `anonymous@${hint}`
    }

    if (interactionLabel === 'wrapped' && moduleLabel) {
      const labelFromModule = moduleLabel.split('/').pop()
      if (labelFromModule) {
        interactionLabel = `wrapped(${labelFromModule})`
      }
    }

    const truncatedSource = source.slice(0, 120)

    if (__DEV__ && moduleInfo?.id !== 12986) {
      console.log(`[${scopeLabel}] interaction:scheduled`, {
        id,
        label: interactionLabel,
        meta: interactionMeta,
        origin: scheduleStack,
        module: moduleLabel,
        moduleId: moduleInfo?.id,
        source: truncatedSource,
      })
    }

    const wrapped = () => {
      const startedAt = Date.now()
      const wait = startedAt - scheduledAt
      const startLogged = wait > waitWarnMs
      if (startLogged && moduleInfo?.id !== 12986) {
        console.log(`[${scopeLabel}] interaction:start`, {
          id,
          wait,
          label: interactionLabel,
          source: truncatedSource,
          origin: scheduleStack,
          module: moduleLabel,
          moduleId: moduleInfo?.id,
          meta: interactionMeta,
        })
      }

      let finished = false
      const logComplete = (status: 'success' | 'error') => {
        if (finished) return
        finished = true
        const duration = Date.now() - startedAt
        if (moduleInfo?.id !== 12986 && (duration > runWarnMs || (!startLogged && wait > waitWarnMs))) {
          console.log(`[${scopeLabel}] interaction:complete`, {
            id,
            status,
            duration,
            wait,
            label: interactionLabel,
            source: truncatedSource,
            origin: scheduleStack,
            module: moduleLabel,
            moduleId: moduleInfo?.id,
            meta: interactionMeta,
          })
        }
      }

      try {
        const result = callback()
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          return (result as Promise<unknown>)
            .then((value) => {
              logComplete('success')
              return value
            })
            .catch((error) => {
              logComplete('error')
              throw error
            })
        }
        logComplete('success')
        return result
      } catch (error) {
        logComplete('error')
        throw error
      }
    }

    return original(wrapped as Parameters<RunAfterInteractions>[0])
  }) as RunAfterInteractions
}
