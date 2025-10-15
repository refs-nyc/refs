const DEFAULT_WIDTH = 200
const DEFAULT_HEIGHT = 200

type ThumbOptions = {
  width?: number
  height?: number
  format?: 'webp' | 'avif' | 'jpeg'
  fit?: 'cover' | 'contain'
}

const isPocketbaseAsset = (url: URL) => /\/api\/files\//.test(url.pathname)

const ensureParam = (url: URL, key: string, value: string) => {
  url.searchParams.set(key, value)
}

export const getThumbUrl = (input?: string | null, opts: ThumbOptions = {}): string | undefined => {
  if (!input) return undefined
  try {
    const url = new URL(input)
    if (!isPocketbaseAsset(url)) {
      return input
    }

    const width = Math.round(opts.width ?? DEFAULT_WIDTH)
    const height = Math.round(opts.height ?? DEFAULT_HEIGHT)
    const fit = opts.fit ?? 'cover'
    const format = opts.format ?? 'webp'

    ensureParam(url, 'thumb', `${width}x${height}`)
    ensureParam(url, 'fit', fit)
    ensureParam(url, 'format', format)

    return url.toString()
  } catch (error) {
    return input
  }
}

export const getAvatarThumbUrl = (input?: string | null, size = 96): string | undefined => {
  return getThumbUrl(input, { width: size, height: size, format: 'webp' })
}
