import { Heading, XStack, YStack } from '@/ui'
import { View, ScrollView, DimensionValue, KeyboardAvoidingView, Keyboard, Modal } from 'react-native'
import { c, s } from '../style'
import { useEffect, useMemo, useRef, useState } from 'react'
import { pocketbase, useUserStore } from '../pocketbase'
import { useMessageStore } from '../pocketbase/stores/messages'
import { Pressable, Text } from 'react-native'
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
  const [highlightedMessageId, setHighlightedMessageId] = useState<string>('');
  const [showInModal, setShowInModal] = useState<'' | 'contextMenu' | 'reactions'>('');
  const [replying, setReplying] = useState<boolean>(false);

  const conversation = conversations[conversationId];
  const members = memberships[conversationId].filter(m => m.expand?.user.id !== user?.id);
  const ownMembership = memberships[conversationId].filter(m => m.expand?.user.id === user?.id)[0];
  const router = useRouter();

  const conversationMessages = messages.filter(m => m.conversation === conversationId);
  const highlightedMessage = conversationMessages.find(m => m.id === highlightedMessageId);

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

  const onMessageLongPress = (id: string) => {
    setHighlightedMessageId(id);
    setShowInModal('contextMenu');
  }

  if (!user) return null;

  const onMessageSubmit = () => 
  {
    sendMessage(user.id, conversationId, message, replying ? highlightedMessageId : undefined);
    setMessage(''); 
    setHighlightedMessageId('')
    setReplying(false);
  }

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
            : conversation.title }
        </Heading>
        {conversation.is_direct ?
          <Link href={`/user/${members[0].expand?.user.userName}`}>
            <Avatar source={members[0].expand?.user.image} size={s.$4} />
          </Link>
          :
          <XStack style={{ flex:1, justifyContent: 'flex-end'}}>
            <Link href={`/messages/${conversationId}/member-list`} >
              <AvatarStack sources={members.map(m=>m.expand?.user.image)} size={s.$3} />
            </Link>
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
              {
                const parentMessage = m.replying_to ? conversationMessages.find(message => message.id === m.replying_to) : undefined;
                // console.log('replying_to', m.replying_to)
                // console.log('cMessages', conversationMessages.map(m=>m.id))
                // console.log('pMessage', parentMessage)
                const parentMessageSender = parentMessage ? memberships[conversationId].find(member => member.expand?.user.id === parentMessage.sender)?.expand?.user : undefined;
                return (
                <MessageBubble 
                  key={m.id} 
                  message={m} 
                  sender={memberships[conversationId].find(member => member.expand?.user.id === m.sender)?.expand?.user || user}
                  showSender={!conversation.is_direct} 
                  senderColor={colorMap[m.sender]}
                  onLongPress={onMessageLongPress}
                  parentMessage={parentMessage}
                  parentMessageSender={parentMessageSender}
                />)
              }
            )}
          </YStack>
        </ScrollView>
       { showInModal && highlightedMessage ?
        <Modal
          animationType="fade"
          transparent={true}
          visible={true}
        >
          <Pressable 
            style={{height: s.full as DimensionValue, backgroundColor: '#0009' }} 
            onPress={() => {setHighlightedMessageId(''); setShowInModal('')}}
          >
            <View style={{ height: '20%', backgroundColor: '#0000' }}>
            </View>
            <View style={{ maxHeight: '80%' }}>
              <View style={{ maxHeight: '20%'}} >
                <MessageBubble 
                  message={highlightedMessage} 
                  showSender={false} 
                  sender={members.find(member => member.expand?.user.id === highlightedMessage.sender)?.expand?.user || user}
                />
              </View>
                <View style={{ minHeight: '80%' }}>
                  {showInModal === 'reactions' &&
                    <EmojiKeyboard 
                      onEmojiSelected={(e) => {sendReaction(user.id, highlightedMessageId, e.emoji); setHighlightedMessageId(''); setShowInModal('')}}
                    />
                  }
                  { showInModal === 'contextMenu' &&
                    <YStack 
                      style={{ 
                        alignSelf: highlightedMessage.sender === user.id ? 'flex-end' : 'flex-start',
                        backgroundColor: c.surface, 
                        padding: s.$08, 
                        borderRadius: s.$1, 
                        width: s.$10 
                      }} 
                    >
                      <Pressable style={{padding: s.$05, width: 'auto'}} onPress={()=>{setShowInModal(''), setReplying(true)}}>
                        <Text>Reply</Text>
                      </Pressable>
                      <Pressable style={{padding: s.$05, width: 'auto'}} onPress={()=>{setShowInModal('reactions')}}>
                        <Text>React</Text>
                      </Pressable>
                    </YStack>
                  }
                </View>
            </View>
          </Pressable>
        </Modal>
       :
        <MessageInput 
          onMessageSubmit={onMessageSubmit} 
          setMessage={setMessage} 
          message={message} 
          parentMessage={replying ? highlightedMessage : undefined}
          parentMessageSender={replying ? members.find(m => m.expand?.user.id === highlightedMessage?.sender)?.expand?.user || user : undefined}
          onReplyClose={() => {setReplying(false), setHighlightedMessageId('')}}
        />
        }
      </KeyboardAvoidingView>
    </View>
  )
}
