import { Heading, YStack } from '@/ui'
import { View, ScrollView, DimensionValue } from 'react-native'
import { c, s } from '../style'
import { useUserStore } from '../pocketbase'
import { useMessageStore } from '../pocketbase/stores/messages'
import SwipeableConversation from '@/ui/messaging/SwipeableConversation'

export function ConversationsScreen() {
  const { user } = useUserStore()
  const { conversations } = useMessageStore()

  if (!user) return null

  return (

    <View
      style={{
        flex: 1,
        justifyContent: 'flex-start',
        paddingTop: s.$8,
        height: s.full as DimensionValue,
      }}
    >
      <Heading
        tag="h1"
        style={{ paddingLeft: s.$2, paddingVertical: s.$1 }}
      >
        Messages
      </Heading>
      <ScrollView style={{ flex: 1 }}>
        <YStack
          gap={s.$075}
          style={{
            flex: 1,
            paddingBottom: s.$14,
            backgroundColor: c.surface,
            width: '90%',
            margin: 'auto'
          }}
        >
          {(Object.values(conversations)).map(i =>
            <SwipeableConversation key={i.id} conversation={i} onArchive={()=>console.log('archive')} />
          )}
        </YStack>
      </ScrollView>
    </View>
  )
}

