const TRACE_ENABLED = process.env.EXPO_PUBLIC_KEYBOARD_TRACE === '1'

type LogPayload = Record<string, unknown> | undefined

const formatPayload = (payload?: LogPayload) => {
  if (!payload) return ''
  try {
    return JSON.stringify(payload)
  } catch {
    return String(payload)
  }
}

export const traceKeyboard = (label: string, payload?: LogPayload) => {
  if (!TRACE_ENABLED) return
  const suffix = formatPayload(payload)
  console.log(`[keyboard-trace] ${label}${suffix ? ` ${suffix}` : ''}`)
}

export const withKeyboardTrace = <T extends (...args: any[]) => any>(
  fn: T,
  label: string
) => {
  if (!TRACE_ENABLED) return fn
  return (...args: Parameters<T>) => {
    traceKeyboard(label)
    return fn(...args)
  }
}

export const isKeyboardTraceEnabled = () => TRACE_ENABLED
