import { XStack } from '@/ui'
import { View, Text } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { s, c } from '@/features/style'

export const SearchResultItem = ({ r }: { r: CompleteRef }) => {
  return (
    <View
      style={{
        // marginVertical: s.$1half,
        paddingVertical: s.$08,
        paddingHorizontal: s.$08,
        borderRadius: s.$075,
      }}
    >
      <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View
            style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: c.accent }}
          ></View>
          <Text>{r.title}</Text>
        </XStack>
        <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          {/* TODO: get count of people referencing */}
          <Text>1 referencing</Text>
          <Ionicons name="close" />
        </XStack>
      </XStack>
    </View>
  )
}
