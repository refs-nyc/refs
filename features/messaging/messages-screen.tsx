import { Heading, YStack } from '@/ui'
import { View, ScrollView, DimensionValue } from 'react-native'
import { c, s } from '../style'
import { useEffect, useState } from 'react'
import { pocketbase, useUserStore } from '../pocketbase'
import { ExpandedConversation } from '../pocketbase/stores/types'
import ConversationListItem from '@/ui/messaging/ConversationListItem'

export function MessagesScreen() 
{
  const [items, setItems] = useState<ExpandedConversation[]>([])
  const { user } = useUserStore()

  if (!user)  return null

  useEffect(() => {
    const getConversations = async () => 
    {
      const conversations = await pocketbase.collection('conversations').getFullList<ExpandedConversation>({
        sort: '-created',
        expand: "messages_via_conversation",
      })
      console.log('conversations', conversations.map(c=>c.expand?.messages_via_conversation))
      setItems(conversations)
    }
    try {
      getConversations()
    }
    catch (error) {
      console.error(error)
    } 

  }, [])

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
          {items.map(i => 
             <ConversationListItem key={i.id} conversation={i}/>
          )}
        </YStack>
      </ScrollView>
    </View>

  )

}

