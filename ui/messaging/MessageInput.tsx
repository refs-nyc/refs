import { Pressable, TextInput, View, Text } from 'react-native'
import { XStack, YStack } from '../core/Stacks'
import { c, s } from '@/features/style'
import { Ionicons } from '@expo/vector-icons'
import { Message, Profile } from '@/features/pocketbase/stores/types'

export default function MessageInput({
  onMessageSubmit,
  setMessage,
  message,
  disabled,
  parentMessage,
  parentMessageSender,
  onReplyClose,
  allowAttachment,
  onAttachmentPress,
}: {
  onMessageSubmit: () => void
  setMessage: (str: string) => void
  message: string
  disabled: boolean
  parentMessage?: Message
  parentMessageSender?: Profile
  onReplyClose?: () => void
  allowAttachment?: boolean
  onAttachmentPress?: () => void
}) {
  return (
    <>
      {parentMessage && (
        <View style={{ backgroundColor: c.surface2, padding: s.$1, borderRadius: s.$2 }}>
          <XStack style={{ justifyContent: 'space-between' }}>
            <YStack>
              <Text style={{ fontWeight: 'bold' }}>
                Replying to {parentMessageSender?.firstName}
              </Text>
              <Text>{parentMessage.text}</Text>
            </YStack>
            <Pressable onPress={onReplyClose}>
              <Ionicons name="close-outline" size={s.$2} color={c.grey2} />
            </Pressable>
          </XStack>
        </View>
      )}
      <XStack
        style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}
        gap={s.$075}
      >
        {allowAttachment && (
          <Ionicons name="add" size={s.$2} color={c.grey2} onPress={onAttachmentPress} />
        )}
        <XStack
          style={{
            backgroundColor: c.white,
            borderRadius: s.$2,
            marginVertical: s.$075,
            paddingVertical: s.$09,
            paddingHorizontal: s.$1,
            justifyContent: 'space-between',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <TextInput
            style={{ width: '70%' }}
            placeholder="Type anything..."
            multiline={true}
            value={message}
            onChangeText={setMessage}
            autoFocus={true}
          />
          <Pressable onPress={onMessageSubmit} disabled={disabled}>
            <Ionicons name="paper-plane-outline" size={s.$2} color={c.grey2} />
          </Pressable>
        </XStack>
      </XStack>
    </>
  )
}
