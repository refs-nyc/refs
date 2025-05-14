import { ScrollView } from 'react-native'
import { YStack } from '../core/Stacks'
import { c, s } from '@/features/style'

export default function ConversationList({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }}>
      <YStack
        gap={s.$075}
        style={{
          flex: 1,
          paddingBottom: s.$14,
          paddingHorizontal: s.$1,
          margin: 'auto',
          width: '100%',
        }}
      >
        {children}
      </YStack>
    </ScrollView>
  )
}
