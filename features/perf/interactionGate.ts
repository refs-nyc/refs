import { create } from 'zustand'

type InteractionGateState = {
  active: boolean
}

const useInteractionGate = create<InteractionGateState>(() => ({
  active: false,
}))

export const setInteractionGateActive = (active: boolean) => {
  const previous = useInteractionGate.getState().active
  if (previous === active) return
  if (__DEV__) {
    console.log('[gate] state change', { active })
  }
  useInteractionGate.setState({ active })
}

export const isInteractionGateActive = () => useInteractionGate.getState().active

export const runIfGateIdle = <T extends (...args: any[]) => any>(fn: T): T => {
  const wrapped = ((...args: Parameters<T>) => {
    if (isInteractionGateActive()) {
      if (__DEV__) {
        console.log('[gate] drop call', { fn: fn.name || 'anonymous' })
      }
      return undefined as ReturnType<T>
    }
    return fn(...args)
  }) as T
  return wrapped
}
