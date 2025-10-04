import { InteractionManager } from 'react-native'

const ENABLED: boolean = typeof __DEV__ !== 'undefined' ? __DEV__ : true

let bootStarted = false
let startTime = 0
let lastMark = 0

const format = (value: number) => value.toFixed(1)

export function bootReset(label = 'boot.start') {
  if (!ENABLED) return
  const now = performance.now()
  bootStarted = true
  startTime = now
  lastMark = now
  console.log(`BOOT | ${label}`)
}

export function bootStep(label: string) {
  if (!ENABLED) return
  const now = performance.now()
  if (!bootStarted) {
    bootReset(label)
    return
  }
  const delta = now - lastMark
  const total = now - startTime
  lastMark = now
  console.log(`BOOT | ${label} | +${format(delta)}ms | ${format(total)}ms`)
}

export function bootIdle(label: string) {
  if (!ENABLED) return
  InteractionManager.runAfterInteractions(() => {
    bootStep(label)
  })
}

export const BOOT_METRICS_ENABLED = ENABLED
