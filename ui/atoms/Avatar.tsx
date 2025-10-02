import { SimplePinataImage } from '../images/SimplePinataImage'
import { View, Text } from 'react-native'
import { c, s } from '@/features/style'
import { Ionicons } from '@expo/vector-icons'

export const Avatar = ({ source, size = s.$3 }: { source: string | undefined; size: number }) => {
  if (!source)
    return (
      <View style={{ width: size, height: size, backgroundColor: "#A6B89F", borderRadius: size / 2, alignItems: "center" }}>
        <View style={{ top: size * 0.16 }}>
          <Ionicons name="person" size={size * 0.65} color='#fff' />
        </View>
      </View>
    )
  return (
    <>
      <View style={{ width: size, height: size }}>
        <SimplePinataImage
          style={{ width: '100%', height: '100%', borderRadius: size / 2, backgroundColor: '#ddd' }}
          originalSource={source}
          imageOptions={{ width: size, height: size }}
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
  const overlap = size * 0.4

  return (
    <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {shownSources.map((source, index) => (
          <View
            key={index}
            style={{
              marginLeft: index === 0 ? 0 : -overlap,
            }}
          >
            <Avatar source={source} size={size} />
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
