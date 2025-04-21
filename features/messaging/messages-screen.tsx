import { Heading, XStack, YStack } from '@/ui'
import { View, ScrollView, Text, DimensionValue, KeyboardAvoidingView, Keyboard } from 'react-native'
import { c, s } from '../style'
import { useEffect, useRef, useState } from 'react'
import { useUserStore } from '../pocketbase'
import { useMessageStore } from '../pocketbase/stores/messages'
import { Pressable, TextInput } from 'react-native-gesture-handler'
import { useRouter } from 'expo-router'
import { Avatar } from '@/ui/atoms/Avatar'
import { Ionicons } from '@expo/vector-icons'

export function MessagesScreen({conversationId} : {conversationId: string})
{
  const { user } = useUserStore()
  const { conversations, memberships, messages, sendMessage } = useMessageStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });

    return () => showSub.remove();
  }, []);

  const conversation = conversations[conversationId];
  const members = memberships[conversationId].filter(m => m.expand?.user.id !== user.id);
  const router = useRouter();

  const conversationMessages = messages.filter(m => m.conversation === conversationId);

  console.log('VIEWING CONVERSATION', conversationId)
  console.log('members', memberships[conversationId].map(m=>m.expand?.user.email))
  console.log('conversationMessages', conversationMessages.map(m=>m.text))

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
        <Pressable onPress={() => { router.dismissTo('/messages') }}>
          <Ionicons name="chevron-back" size={s.$2} color={c.grey2} />
        </Pressable>
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
          onContentSizeChange={()=>{scrollViewRef.current?.scrollToEnd({ animated: true });}}
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
            {conversationMessages.map(i => 
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
          <XStack 
            style={{ 
              backgroundColor: c.white,
              borderRadius: s.$2,
              marginVertical: s.$075,
              marginHorizontal: s.$1,
              paddingVertical: s.$09,
              paddingHorizontal: s.$1,
              justifyContent: 'space-between',
              fontSize: s.$09,
              alignItems: 'center',
            }}
          >
            <TextInput
              style={{
                width: '70%',
              }}
              placeholder="Type anything..."
              multiline={true}
              value={message}
              onChangeText={setMessage}
            />
            <Pressable
              onPress={() => {
                sendMessage(user.id, conversationId, message);
                setMessage('');
              }}
            >
              <Ionicons 
                name="paper-plane-outline" 
                size={s.$2} 
                color={c.grey2} 

              />
            </Pressable>
          </XStack>
      </KeyboardAvoidingView>
    </View>
  )
}

