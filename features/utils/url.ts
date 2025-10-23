const SCHEME_REGEX = /^[a-z][a-z0-9+\-.]*:/i

/**
 * Ensure URLs have an explicit scheme so they open in the system browser.
 * - Preserves existing schemes (`https://`, `mailto:`, `refsnyc://`, etc.)
 * - Defaults to `https://` when the user leaves the scheme off (`example.com`)
 */
export const normalizeExternalUrl = (raw?: string | null): string => {
  if (!raw) return ''

  const trimmed = raw.trim()
  if (!trimmed) return ''

  if (SCHEME_REGEX.test(trimmed)) {
    return trimmed
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`
  }

  return `https://${trimmed}`
}
