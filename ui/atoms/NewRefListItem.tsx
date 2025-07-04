import { View, Text, Pressable } from 'react-native'
import { XStack } from '@/ui/core/Stacks'
import { Image } from 'expo-image'
import { base, s, c } from '@/features/style'

export const NewRefListItem = ({ title, image = '' }: { title: string; image: string }) => {
  return (
    <View
      style={{
        paddingVertical: s.$08,
        paddingHorizontal: s.$08,
        borderRadius: s.$075,
      }}
    >
      <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          {image === '' ? (
            <View style={[base.smallSquare, { backgroundColor: c.olive2 }]}></View>
          ) : (
            <Image source={image} style={[base.smallSquare, { backgroundColor: c.olive2 }]}></Image>
          )}
          <Text style={{ color: c.white }}>{title}</Text>
        </XStack>
        <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: c.white }}>New Ref</Text>
        </XStack>
      </XStack>
    </View>
  )
}
