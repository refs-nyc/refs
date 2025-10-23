import { traceKeyboard } from './keyboardTrace'

let activeInput = {
  id: '',
  lastFocusedAt: 0,
}

export const setActiveKeyboardInput = (id: string) => {
  activeInput = {
    id,
    lastFocusedAt: Date.now(),
  }
  traceKeyboard('focus', activeInput)
}

export const clearActiveKeyboardInput = (id?: string) => {
  if (id && activeInput.id && activeInput.id !== id) {
    return
  }

  activeInput = {
    id: '',
    lastFocusedAt: Date.now(),
  }
  traceKeyboard('blur', { id: id ?? null })
}

export const getActiveKeyboardInput = () => activeInput

export const shouldGuardDismiss = (windowMs: number) => {
  if (!activeInput.id) {
    return false
  }
  return Date.now() - activeInput.lastFocusedAt < windowMs
}
