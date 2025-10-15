const DEFAULT_WINDOW_MS = 5000
const DEFAULT_CAP_BYTES = 1_000_000

type BootFetchOptions = {
  windowMs?: number
  capBytes?: number
}

let installed = false

export function installBootFetchLogger(options: BootFetchOptions = {}) {
  if (installed) return
  if (typeof globalThis.fetch !== 'function') {
    installed = true
    return
  }

  installed = true
  const bootStartedAt = Date.now()
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS
  const capBytes = options.capBytes ?? DEFAULT_CAP_BYTES
  const originalFetch = globalThis.fetch.bind(globalThis)
  let totalBytes = 0

  const logSummary = () => {
    const elapsed = Date.now() - bootStartedAt
    if (elapsed <= windowMs) {
      setTimeout(logSummary, windowMs - elapsed + 50)
      return
    }
    console.log('[boot:net] totalBytes', totalBytes)
  }

  setTimeout(logSummary, windowMs + 60)

  globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
    const startedAt = Date.now()
    const response = await originalFetch(...args)

    if (startedAt - bootStartedAt < windowMs) {
      let url: string | undefined
      const input = args[0]
      if (typeof input === 'string') {
        url = input
      } else if (input instanceof Request) {
        url = input.url
      } else if (typeof (input as any)?.url === 'string') {
        url = String((input as any).url)
      }

      let host = 'unknown'
      let path = ''
      if (url) {
        try {
          const parsed = new URL(url)
          host = parsed.host
          path = parsed.pathname
        } catch {
          host = url
        }
      }

      const header = response.headers.get('content-length')
      const bytes = header ? parseInt(header, 10) : NaN
      if (!Number.isNaN(bytes)) {
        totalBytes += bytes
      }

      console.log('[boot:net]', {
        host,
        path,
        bytes: Number.isNaN(bytes) ? 'unknown' : bytes,
      })

      if (!Number.isNaN(bytes) && bytes > capBytes) {
        console.warn('[boot:net][cap-hit]', { host, path, bytes, capBytes })
      }
    }

    return response
  }
}
