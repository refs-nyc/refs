/* eslint-disable no-console */
import type { QueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { getIdleQueueStats } from '@/features/utils/idleQueue'

type AsyncStorageLike = {
  setItem: (key: string, value: string) => Promise<void>
  getItem: (key: string) => Promise<string | null>
}

type PerfHarnessOptions = {
  reactQueryClient?: QueryClient
  enableRequireProbe?: boolean
  enableIOTripwires?: boolean
  enableLagProbe?: boolean
  bootWindowMs?: number
  maxJsonBytes?: number
  maxRequireMs?: number
  verbose?: boolean
}

export const bootInvariant = {
  prePaint: true,
  markPaint() {
    this.prePaint = false
    console.log('[perf] first-paint marked')
  },
}

export const markFirstPaint = () => bootInvariant.markPaint()

export function assertPostPaint(label: string) {
  if (!bootInvariant.prePaint) return
  const err = new Error(`[BOOT VIOLATION] ${label} ran before first paint`)
  console.error(err.stack)
  throw err
}

const now = () =>
  // @ts-ignore
  globalThis?.performance?.now?.() ?? Date.now()

const stack = (lines = 8) =>
  new Error().stack?.split('\n').slice(2, 2 + lines).join('\n') ?? '(no stack)'

const LOG_STACKS = process.env.EXPO_PUBLIC_PERF_VERBOSE === '1'

let requirePatched = false
function patchRequireProbe(maxRequireMs = 50, verbose = false) {
  if (requirePatched) return
  const original = (globalThis as any).require
  if (typeof original !== 'function') return
  ;(globalThis as any).require = (id: string) => {
    const t0 = Date.now()
    const mod = original(id)
    const dt = Date.now() - t0
    if (dt > maxRequireMs) {
      console.warn(`[REQUIRE SLOW] ${id} ${dt}ms\n${stack(6)}`)
    } else if (verbose && dt > 0 && (id.includes('pocketbase') || id.includes('polyfill'))) {
      console.log(`[require] ${id} ${dt}ms`)
    }
    return mod
  }
  requirePatched = true
}

let jsonPatched = false
function patchJSONTripwires(maxBytes = 50_000) {
  if (jsonPatched) return
  const originalStringify = JSON.stringify
  const originalParse = JSON.parse

  ;(JSON as any).stringify = (value: any, ...rest: any[]) => {
    const serialized = originalStringify(value, ...rest)
    if (serialized && serialized.length > maxBytes) {
      const prefix = bootInvariant.prePaint ? '[JSON BIG pre-paint]' : '[JSON BIG]'
      console.warn(`${prefix} stringify ${serialized.length}B\n${stack(6)}`)
    }
    return serialized
  }

  ;(JSON as any).parse = (value: string, ...rest: any[]) => {
    const started = Date.now()
    const parsed = originalParse(value, ...rest)
    const duration = Date.now() - started
    if (value && value.length > maxBytes) {
      const prefix = bootInvariant.prePaint ? '[JSON BIG pre-paint]' : '[JSON BIG]'
      console.warn(`${prefix} parse ${value.length}B in ${duration}ms\n${stack(6)}`)
    }
    return parsed
  }

  jsonPatched = true
}

let storagePatched = false
async function patchAsyncStorageTripwires(maxBytes = 50_000) {
  if (storagePatched) return
  let asyncStorage: AsyncStorageLike | null = null
  try {
    asyncStorage = (await import('@react-native-async-storage/async-storage')) as any
  } catch {
    return
  }
  if (!asyncStorage?.setItem) return

  const originalSetItem = asyncStorage.setItem.bind(asyncStorage)
  const originalGetItem = asyncStorage.getItem.bind(asyncStorage)

  ;(asyncStorage as any).setItem = async (key: string, value: string) => {
    const size = value?.length ?? 0
    const prefix = bootInvariant.prePaint ? 'pre-paint ' : ''
    const started = Date.now()
    const result = await originalSetItem(key, value)
    const duration = Date.now() - started
    if (size > maxBytes || duration > 50) {
      console.warn(`[AS WRITE ${prefix}] key=${key} size=${size}B took ${duration}ms\n${stack(6)}`)
    }
    return result
  }

  ;(asyncStorage as any).getItem = async (key: string) => {
    const started = Date.now()
    const result = await originalGetItem(key)
    const duration = Date.now() - started
    if ((result?.length ?? 0) > maxBytes || duration > 50) {
      const prefix = bootInvariant.prePaint ? 'pre-paint ' : ''
      console.warn(`[AS READ ${prefix}] key=${key} size=${result?.length ?? 0}B took ${duration}ms\n${stack(6)}`)
    }
    return result
  }

  storagePatched = true
}

let lagProbeStarted = false
function startLagProbe(thresholdMs = 250) {
  if (lagProbeStarted) return
  lagProbeStarted = true
  let last = now()
  const tick = () => {
    const current = now()
    const lag = current - last - 16
    if (lag > thresholdMs) {
      const idleStats = getIdleQueueStats?.()
      const base =
        `[lag] long task ~${Math.round(lag)}ms (prePaint=${bootInvariant.prePaint})` +
        ` pending=${idleStats?.pending ?? 'na'} last=${idleStats?.lastLabel ?? 'na'} duration=${Math.round(
          idleStats?.lastDuration ?? 0
        )}ms`
      console.warn(LOG_STACKS ? `${base}\n${stack(3)}` : base)
    }
    last = current
    setTimeout(tick, 16)
  }
  tick()
}

export function effectProbe(name: string, fn: () => any, deps: React.DependencyList) {
  React.useEffect(() => {
    const started = Date.now()
    const result = fn()
    const duration = Date.now() - started
    if (duration > 50) {
      const prefix = bootInvariant.prePaint ? 'pre-paint ' : ''
      console.warn(`[EFFECT SLOW ${prefix}] ${name} ${duration}ms\n${stack(6)}`)
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

let reactQueryPatched = false
function patchReactQuerySetQueryData(client: QueryClient, maxBytes = 80_000) {
  if (reactQueryPatched) return
  const originalSet = client.setQueryData.bind(client)
  ;(client as any).setQueryData = (key: any, value: any, ...rest: any[]) => {
    let approx = -1
    try {
      approx = JSON.stringify(value)?.length ?? -1
    } catch {}
    if (approx > maxBytes) {
      const prefix = bootInvariant.prePaint ? 'pre-paint ' : ''
      console.warn(`[RQ HEAVY WRITE ${prefix}] key=${safeKey(key)} size≈${approx}\n${stack(6)}`)
    }
    return originalSet(key, value, ...rest)
  }
  reactQueryPatched = true
}

const safeKey = (key: any) => {
  try {
    return JSON.stringify(key)
  } catch {
    return String(key)
  }
}

export async function enablePerfHarness(options: PerfHarnessOptions = {}) {
  const {
    reactQueryClient,
    enableRequireProbe = true,
    enableIOTripwires = true,
    enableLagProbe: lagProbe = true,
    bootWindowMs = 2000,
    maxJsonBytes = 50_000,
    maxRequireMs = 50,
    verbose = false,
  } = options

  if (enableRequireProbe) patchRequireProbe(maxRequireMs, verbose)
  if (enableIOTripwires) {
    patchJSONTripwires(maxJsonBytes)
    await patchAsyncStorageTripwires(maxJsonBytes)
  }
  if (reactQueryClient) patchReactQuerySetQueryData(reactQueryClient)
  if (lagProbe) startLagProbe(250)

  setTimeout(() => {
    if (!bootInvariant.prePaint) return
    console.log('[perf] auto-ending boot pre-paint window')
    bootInvariant.prePaint = false
  }, bootWindowMs)
}

export const perfMarks = new Map<string, number>()
export const mark = (label: string) => perfMarks.set(label, Date.now())
export const done = (label: string) => {
  const started = perfMarks.get(label)
  const duration = typeof started === 'number' ? Date.now() - started : 0
  console.log(`[boot] ${label} ${duration}ms`)
  return duration
}

export function assertPostPaintSnapshotWrite(key: string) {
  assertPostPaint(`putSnapshot(${key})`)
}

export function assertPostPaintMessaging(label: string) {
  assertPostPaint(`messaging.${label}`)
}

export function assertPostPaintPreviewBuild() {
  assertPostPaint('buildPreview')
}
