import { XStack } from '../core/Stacks'
import { View, Text, Pressable } from 'react-native'
import { s, c, base } from '@/features/style'

export const NewListItemButton = ({
  onPress,
  label = 'Add a ref to the list',
}: {
  onPress: () => void
  label?: string
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: s.$08,
        borderRadius: s.$075,
        backgroundColor: c.olive,
      }}
    >
      <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View
            style={[
              base.largeSquare,
              {
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: c.accent,
              },
            ]}
          >
            <Text
              style={{
                color: c.white,
                width: '100%',
                textAlign: 'center',
                fontSize: s.$2,
              }}
            >
              +
            </Text>
          </View>
          <Text>{label}</Text>
        </XStack>
      </XStack>
    </Pressable>
  )
}
