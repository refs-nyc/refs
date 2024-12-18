import { View, Text } from 'react-native'
import { XStack } from '@/ui'
import { s, c } from '@/features/style'

export const NewRefListItem = ({ title }: { title: string }) => {
  return (
    <View
      style={{
        marginVertical: s.$1half,
        paddingVertical: s.$08,
        paddingHorizontal: s.$08,
        borderRadius: s.$075,
      }}
    >
      <XStack gap={s.$3} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <XStack gap={s.$3} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View
            style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: c.accent }}
          ></View>
          <Text>{title}</Text>
        </XStack>
        <XStack gap={s.$3} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          {/* TODO: get count of people referencing */}
          <Text>New Ref</Text>
        </XStack>
      </XStack>
    </View>
  )
}
