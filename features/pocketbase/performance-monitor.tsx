import { useEffect, useRef } from 'react'
import { usePathname } from 'expo-router'

interface PerformanceMetric {
  type: 'profile_load' | 'feed_load' | 'search_history_load'
  duration: number
  cacheHit: boolean
  timestamp: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private startTimes = new Map<string, number>()

  startTimer(type: string) {
    this.startTimes.set(type, Date.now())
  }

  endTimer(type: string, cacheHit: boolean = false) {
    const startTime = this.startTimes.get(type)
    if (!startTime) return

    const duration = Date.now() - startTime
    const metric: PerformanceMetric = {
      type: type as any,
      duration,
      cacheHit,
      timestamp: Date.now()
    }

    this.metrics.push(metric)
    this.startTimes.delete(type)

    // Keep only last 50 metrics
    if (this.metrics.length > 50) {
      this.metrics = this.metrics.slice(-50)
    }

    // Log performance
    const cacheStatus = cacheHit ? '🚀 CACHE HIT' : '🔄 FRESH LOAD'
    console.log(`📊 ${cacheStatus} - ${type}: ${duration}ms`)
  }

  getAverageLoadTime(type: string): number {
    const typeMetrics = this.metrics.filter(m => m.type === type)
    if (typeMetrics.length === 0) return 0
    
    const total = typeMetrics.reduce((sum, m) => sum + m.duration, 0)
    return Math.round(total / typeMetrics.length)
  }

  getCacheHitRate(type: string): number {
    const typeMetrics = this.metrics.filter(m => m.type === type)
    if (typeMetrics.length === 0) return 0
    
    const cacheHits = typeMetrics.filter(m => m.cacheHit).length
    return Math.round((cacheHits / typeMetrics.length) * 100)
  }

  getRecentMetrics(count: number = 10): PerformanceMetric[] {
    return this.metrics.slice(-count)
  }

  logSummary() {
    const types = ['profile_load', 'feed_load', 'search_history_load']
    
    console.log('📊 Performance Summary:')
    types.forEach(type => {
      const avgTime = this.getAverageLoadTime(type)
      console.log(`  ${type}: ${avgTime}ms avg`)
    })
  }
}

export const performanceMonitor = new PerformanceMonitor()

export function PerformanceMonitorComponent() {
  const pathname = usePathname()
  const lastPathname = useRef(pathname)

  useEffect(() => {
    // Log performance summary when navigating
    if (lastPathname.current !== pathname) {
      setTimeout(() => {
        performanceMonitor.logSummary()
      }, 1000)
      lastPathname.current = pathname
    }
  }, [pathname])

  return null
} 
 
 
 