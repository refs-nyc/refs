import { SimplePinataImage } from '../images/SimplePinataImage'
import { View, Text } from 'react-native'
import { c, s } from '@/features/style'
import { Ionicons } from '@expo/vector-icons'
import { YStack, XStack } from '../core/Stacks'

export const Avatar = ({ source, size = s.$3 }: { source: string | undefined; size: number }) => {
  if (!source)
    return (
      <View style={{ width: size, height: size }}>
        <Ionicons name="person" size={size} color={c.accent} />
      </View>
    )
  return (
    <>
      <View style={{ width: size, height: size }}>
        <SimplePinataImage
          style={{ width: '100%', height: '100%', borderRadius: size / 2, backgroundColor: '#ddd' }}
          originalSource={source}
          imageOptions={{ width: size * 2, height: size * 2 }}
        />
      </View>
    </>
  )
}

export const AvatarStack = ({
  sources,
  size = s.$3,
}: {
  sources: (string | undefined)[]
  size: number
}) => {
  let shownSources = sources.filter((s) => s) as string[]
  if (shownSources.length > 3) shownSources = shownSources.slice(0, 3)

  const others = sources.length - shownSources.length
  const ySpacing = 5
  const xSpacing = size / 2

  return (
    <>
      <YStack gap={0}>
        <XStack
          style={{
            height: size + (shownSources.length - 1) * ySpacing,
            width: size + xSpacing * (shownSources.length - 1),
            margin: 'auto',
          }}
        >
          {shownSources.map((source, index) => (
            <View
              key={index}
              style={{
                position: 'relative',
                left: -size * index + index * xSpacing,
                top: index * ySpacing,
              }}
            >
              <Avatar source={source} size={size} />
            </View>
          ))}
        </XStack>
        {others > 0 && (
          <Text>
            {' '}
            and <Text style={{ fontWeight: 'bold' }}>{others} others</Text>
          </Text>
        )}
      </YStack>
    </>
  )
}
