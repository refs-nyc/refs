import { Heading, SheetScreen, XStack, YStack } from '@/ui'
import { View, ScrollView, DimensionValue, KeyboardAvoidingView, Keyboard } from 'react-native'
import { c, s } from '../style'
import { useEffect, useMemo, useRef, useState } from 'react'
import { pocketbase, useUserStore } from '../pocketbase'
import { useMessageStore } from '../pocketbase/stores/messages'
import { Pressable } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { Avatar, AvatarStack } from '@/ui/atoms/Avatar'
import { Ionicons } from '@expo/vector-icons'
import MessageBubble from '@/ui/messaging/MessageBubble'
import { EmojiKeyboard } from 'rn-emoji-keyboard'
import MessageInput from '@/ui/messaging/MessageInput'
import { randomColors } from './utils'

export function MessagesScreen({conversationId} : {conversationId: string})
{
  const { user } = useUserStore()
  const { conversations, memberships, messages, sendMessage, sendReaction } = useMessageStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const [message, setMessage] = useState<string>('');
  const [reactingTo, setReactingTo] = useState<string>('');

  const conversation = conversations[conversationId];
  const members = memberships[conversationId].filter(m => m.expand?.user.id !== user?.id);
  const ownMembership = memberships[conversationId].filter(m => m.expand?.user.id === user?.id)[0];
  const router = useRouter();

  const conversationMessages = messages.filter(m => m.conversation === conversationId);

  const colorMap = useMemo(() => {
    const colors = randomColors(members.length);

    const map = members.reduce((acc, member, index) => {
      if (member.expand?.user.id) acc[member.expand?.user.id] = colors[index];
      return acc;
    }, {} as Record<string, any>);

    return map;
  }, [members.length])
  
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
    return () => showSub.remove();
  }, []);

  useEffect(() => {
    async function setLastRead() {
      const lastReadDate = conversationMessages[conversationMessages.length-1].created;
      await pocketbase.collection('memberships').update(ownMembership.id, {last_read: lastReadDate});
    }
    setLastRead();
  }, [])

  if (!user) return null;


  // console.log('VIEWING CONVERSATION', conversationId)
  // console.log('members', memberships[conversationId].map(m=>m.expand?.user.email))
  // console.log('all messages', messages.map(m=>m.text))
  // console.log('conversationMessages', conversationMessages.map(m=>m.text))

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
            : conversation.title || 'Group Chat'}
        </Heading>
        {conversation.is_direct ?
          <Link href={`/user/${members[0].expand?.user.userName}`}>
            <Avatar source={members[0].expand?.user.image} size={s.$4} />
          </Link>
          :
          <XStack style={{ flex:1, justifyContent: 'flex-end'}}>
            <AvatarStack sources={members.map(m=>m.expand?.user.image)} size={s.$3} />
          </XStack>
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
          onContentSizeChange={()=>{scrollViewRef.current?.scrollToEnd({ animated: true });}}
        >
          <YStack
            gap={s.$0}
            style={{ flex: 1, width: '90%', margin: 'auto' }}
          >
            {conversationMessages.map(m => 
              <MessageBubble 
                key={m.id} 
                message={m} 
                sender={memberships[conversationId].find(member => member.expand?.user.id === m.sender)?.expand?.user}
                showSender={!conversation.is_direct} 
                setReactingTo={setReactingTo} 
                senderColor={colorMap[m.sender]}
              />
            )}
          </YStack>
        </ScrollView>
       { reactingTo ? 
        <SheetScreen
          snapPoints={['70%']}
          backgroundStyle={{
            backgroundColor: 'transparent',
            padding: 0,
          }}
          onChange={(i: number) => {
            if (i === -1) setReactingTo('')
          }}
        >
          <View style={{ maxHeight: '20%'}} >
            <MessageBubble 
              message={messages.filter(m=>m.id === reactingTo)[0]} 
              showSender={false} 
              sender={members.find(member => member.expand?.user.id === m.sender)?.expand?.user}
            />
          </View>
          <View style={{ minHeight: '80%' }}>
            <EmojiKeyboard 
              onEmojiSelected={(e) => {sendReaction(user.id, reactingTo, e.emoji); setReactingTo(''); console.log(e)}}
            />
          </View>
        </SheetScreen>
       :
        <MessageInput 
          onMessageSubmit={() => {sendMessage(user.id, conversationId, message); setMessage('');}} 
          setMessage={setMessage} 
          message={message} 
        />
        }
      </KeyboardAvoidingView>
    </View>
  )
}
