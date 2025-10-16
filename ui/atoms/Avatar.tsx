import { useMemo } from 'react'
import { View, Text } from 'react-native'
import { Image } from 'expo-image'
import { c } from '@/features/style'
import { useSignedImageUrl } from '@/ui/images/SimplePinataImage'
import { getAvatarThumbUrl } from '@/features/media/thumb'
import { nearestBucket, currentDpr } from '@/ui/images/avatar-sizes'

type AvatarProps = {
  source?: string | null
  size: number
  fallback?: string | null
  priority?: 'must' | 'low'
}

const deriveInitial = (text?: string | null) => {
  const trimmed = (text || '').trim()
  if (!trimmed) return ''
  return trimmed[0]?.toUpperCase() ?? ''
}

export const Avatar = ({ source, size, fallback, priority = 'low' }: AvatarProps) => {
  const finalSize = typeof size === 'number' ? size : 32
  const bucket = nearestBucket(finalSize)
  const deviceScale = currentDpr()
  const initial = useMemo(() => deriveInitial(fallback), [fallback])
  const thumbSource = getAvatarThumbUrl(source, bucket)
  const { source: resolvedSource } = useSignedImageUrl(
    thumbSource ?? source,
    {
      width: bucket * deviceScale,
      height: bucket * deviceScale,
    },
    { priority }
  )

  const circleStyle = {
    width: bucket,
    height: bucket,
    borderRadius: bucket / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
    backgroundColor: 'rgba(176,176,176,0.35)',
  }

  return (
    <View style={circleStyle}>
      {resolvedSource ? (
        <Image
          source={resolvedSource}
          style={{ width: bucket, height: bucket, borderRadius: bucket / 2 }}
          contentFit="cover"
          cachePolicy="memory"
          transition={150}
        />
      ) : initial ? (
        <Text style={{ color: c.surface, fontWeight: '700' }}>{initial}</Text>
      ) : null}
    </View>
  )
}

export const AvatarStack = ({
  sources,
  size = 32,
  fallbacks,
}: {
  sources: (string | undefined)[]
  size?: number | string
  fallbacks?: (string | undefined)[]
}) => {
  const finalSize = typeof size === 'number' ? size : Number(size) || 32
  const shownSources = sources.filter((s): s is string => Boolean(s)).slice(0, 3)
  const others = sources.length - shownSources.length
  const overlap = finalSize * 0.4

  return (
    <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {shownSources.map((src, index) => (
          <View key={src + index} style={{ marginLeft: index === 0 ? 0 : -overlap }}>
            <Avatar source={src} fallback={fallbacks?.[index]} size={finalSize} />
          </View>
        ))}
      </View>
      {others > 0 && (
        <Text>
          {' '}
          and <Text style={{ fontWeight: 'bold' }}>{others} others</Text>
        </Text>
      )}
    </View>
  )
}
