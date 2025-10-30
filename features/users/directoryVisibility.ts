const normalizeVisibilityValue = (value?: string | null) => (value || '').trim().toLowerCase()

export const HIDDEN_DIRECTORY_PROFILES = new Set(['david heald', 'jackson', 'test 50'])

type DirectoryPersonLike = {
  userName?: string | null
  name?: string | null
  firstName?: string | null
  lastName?: string | null
}

export const isHiddenDirectoryProfile = (input: DirectoryPersonLike) => {
  const candidates = new Set<string>()

  candidates.add(normalizeVisibilityValue(input.userName))
  candidates.add(normalizeVisibilityValue(input.name))
  candidates.add(normalizeVisibilityValue(input.firstName))
  candidates.add(normalizeVisibilityValue(input.lastName))

  const combined = `${normalizeVisibilityValue(input.firstName)} ${normalizeVisibilityValue(input.lastName)}`.trim()
  if (combined) {
    candidates.add(combined)
  }

  for (const value of candidates) {
    if (value && HIDDEN_DIRECTORY_PROFILES.has(value)) {
      return true
    }
  }

  return false
}
