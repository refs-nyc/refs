import { PixelRatio } from 'react-native'

export const AVATAR_PX = 60
export const AVATAR_BUCKETS = [24, 32, 40, 48, 60, 80] as const

export const nearestBucket = (px: number) =>
  AVATAR_BUCKETS.reduce((closest, candidate) => {
    return Math.abs(candidate - px) < Math.abs(closest - px) ? candidate : closest
  }, AVATAR_BUCKETS[0])

export const currentDpr = () => Math.min(Math.ceil(PixelRatio.get()), 3)
