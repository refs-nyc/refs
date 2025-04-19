import { Button, Heading, XStack, YStack } from '@/ui'
import { View, ScrollView, Text, DimensionValue, KeyboardAvoidingView, Keyboard } from 'react-native'
import { c, s } from '../style'
import { useEffect, useRef, useState } from 'react'
import { pocketbase, useUserStore } from '../pocketbase'
import {  Message } from '../pocketbase/stores/types'
import { useMessageStore } from '../pocketbase/stores/messages'
import { TextInput } from 'react-native-gesture-handler'
import { useRouter } from 'expo-router'
import { Avatar } from '@/ui/atoms/Avatar'

export function MessagesScreen({conversationId} : {conversationId: string})
{
  const [items, setItems] = useState<Message[]>([])
  const { user } = useUserStore()
  const { conversations } = useMessageStore();
  const { memberships } = useMessageStore();
  const scrollViewRef = useRef<ScrollView>(null);

  if (!user) return null

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });

    return () => showSub.remove();
  }, []);

  useEffect(() => {
    const getMessages = async () => {
      const messages = await pocketbase.collection('messages').getFullList<Message>({
        filter: `conversation = "${conversationId}"`,
        sort: 'created',
      })
      console.log('messages', messages)
      setItems(messages)
    }
    try {
      getMessages()
    }
    catch (error) {
      console.error(error)
    }

  }, [])

  const conversation = conversations[conversationId];
  const members = memberships[conversationId].filter(m => m.expand?.user.id !== user.id);
  const router = useRouter();

  return (

    <View
      style={{
        flex: 1,
        justifyContent: 'flex-start',
        paddingTop: s.$8,
        height: s.full as DimensionValue,
        backgroundColor: c.surface,
      }}
    >
      <XStack gap={s.$1} style={{ alignItems: 'center', padding: s.$1 }}>
        <Button 
          onPress={()=>{router.dismissTo('/messages')}}
          title="<"
          variant="smallMuted"
          style={{ 
            // backgroundColor: "yellow", 
            height: s.$3,
            minWidth: s.$3,
            paddingHorizontal: s.$0,
            width: s.$3,
          }}
        />
        <Heading tag="h2semi">
          {conversation.is_direct ? 
            members[0].expand?.user.firstName + " " + members[0].expand?.user.lastName 
            : 'Group Chat'}
        </Heading>
        {conversation.is_direct && 
          <Avatar source={members[0].expand?.user.image} size={s.$4} />
        }
      </XStack>
      <KeyboardAvoidingView       
        style={{ 
          height: "85%"
        }}
        behavior={"padding"}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={{ 
            //backgroundColor: "purple",
          }}
        >
          <YStack
            gap={s.$0}
            style={{
              flex: 1,
              // backgroundColor: "lightblue",
              width: '90%',
              margin: 'auto',
            }}
          >
            {items.map(i => 
              {
                const isMe = i.sender === user.id;
                return (
                  <View 
                    key={i.id} 
                    style={{ 
                      backgroundColor: isMe ? c.accent2 : c.surface2, 
                      padding: s.$09, 
                      marginVertical: s.$05,
                      borderRadius: s.$075, 
                      maxWidth: '70%',
                      alignSelf: isMe ? 'flex-end' : 'flex-start'
                    }}
                    >
                    <Text>{i.text}</Text>
                  </View>
                  )
              }
            )}
          </YStack>
        </ScrollView>
        <View 
            style={{ 
              //backgroundColor: "blue",
            }}
          >
            <TextInput
              style={{
                backgroundColor: c.white,
                marginVertical: s.$075,
                marginHorizontal: s.$1,
                padding: s.$09,
                borderRadius: s.$2,
                fontSize: s.$09,
              }}
              placeholder="Type anything..."
            />
          </View>
      </KeyboardAvoidingView>
    </View>
  )
}

