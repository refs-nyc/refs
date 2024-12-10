import { View, Text } from 'react-native'
import { XStack } from '@/ui'

export const NewRefListItem = ({ title }: { title: string }) => {
  return (
    <View px="$2" my="$1.5" py="$2" borderRadius="$2">
      <XStack gap="$3" jc="space-between" ai="center">
        <XStack gap="$3" jc="space-between" ai="center">
          <View style={{ width: 20, height: 20, borderRadius: 4 }} bg="$accent"></View>
          <Text>{title}</Text>
        </XStack>
        <XStack gap="$3" jc="space-between" ai="center">
          {/* TODO: get count of people referencing */}
          <Text>New Ref</Text>
        </XStack>
      </XStack>
    </View>
  )
}
