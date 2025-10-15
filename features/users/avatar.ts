export type AvatarCarrier = {
  image?: string | null
  avatar_url?: string | null
}

const clean = (value?: string | null) => (typeof value === 'string' ? value.trim() : '')

export const normalizeAvatarFields = <T extends AvatarCarrier>(record: T | null | undefined): T | undefined => {
  if (!record) return undefined
  const existingImage = clean(record.image)
  const existingAvatar = clean(record.avatar_url)
  const canonical = existingImage || existingAvatar

  if (!canonical) {
    return {
      ...record,
      image: undefined,
      avatar_url: undefined,
    }
  }

  return {
    ...record,
    image: canonical,
    avatar_url: canonical,
  }
}

export const getAvatarUrl = (record: AvatarCarrier | null | undefined) => {
  const normalized = normalizeAvatarFields(record)
  return normalized?.image || normalized?.avatar_url || ''
}
