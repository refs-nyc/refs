import { View, Text, Pressable } from 'react-native'
import { XStack } from '@/ui'
import { Image } from 'expo-image'
import { s, c } from '@/features/style'

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
            <View
              style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: c.accent }}
            ></View>
          ) : (
            <Image
              source={image}
              style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: c.accent }}
            ></Image>
          )}
          <Text>{title}</Text>
        </XStack>
        <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>New Ref</Text>
        </XStack>
      </XStack>
    </View>
  )
}
