// Simple performance monitoring utility
class PerformanceMonitor {
  private timers: Map<string, number> = new Map()
  private metrics: Map<string, number[]> = new Map()

  startTimer(name: string): void {
    this.timers.set(name, performance.now())
  }

  endTimer(name: string): number {
    const startTime = this.timers.get(name)
    if (!startTime) {
      console.warn(`Timer ${name} was not started`)
      return 0
    }

    const duration = performance.now() - startTime
    this.timers.delete(name)

    // Store metric for averaging
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(duration)

    // Log slow operations
    if (duration > 100) {
      console.warn(`🐌 Slow operation: ${name} took ${duration.toFixed(2)}ms`)
    }

    return duration
  }

  getAverageTime(name: string): number {
    const times = this.metrics.get(name)
    if (!times || times.length === 0) return 0
    return times.reduce((a, b) => a + b, 0) / times.length
  }

  clearMetrics(): void {
    this.metrics.clear()
  }
}

export const performanceMonitor = new PerformanceMonitor()

// React hook for measuring component render time
export const usePerformanceMonitor = (componentName: string) => {
  const startRender = () => {
    performanceMonitor.startTimer(`${componentName}-render`)
  }

  const endRender = () => {
    performanceMonitor.endTimer(`${componentName}-render`)
  }

  return { startRender, endRender }
} 