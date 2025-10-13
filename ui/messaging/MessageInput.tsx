import { Pressable, TextInput, View, Text, ActivityIndicator, StyleSheet, ScrollView } from 'react-native'
import { XStack, YStack } from '../core/Stacks'
import { c, s } from '@/features/style'
import { Ionicons } from '@expo/vector-icons'
import { Message, Profile } from '@/features/types'
import { useRef, useEffect } from 'react'
import { Image } from 'expo-image'

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
  compact = false,
  attachments = [],
  onAttachmentClear,
}: {
  onMessageSubmit: () => void | Promise<void>
  setMessage: (str: string) => void
  message: string
  disabled: boolean
  parentMessage?: Message
  parentMessageSender?: Profile
  onReplyClose?: () => void
  allowAttachment?: boolean
  onAttachmentPress?: () => void | Promise<void>
  compact?: boolean
  attachments?: Array<{ id: string; localUri: string; status: 'uploading' | 'ready' }>
  onAttachmentClear?: (id: string) => void
}) {
  const verticalSpacing = compact ? s.$05 : s.$075
  const inputRef = useRef<TextInput>(null)

  // Focus the input when component mounts (more reliable than autoFocus during navigation)
  useEffect(() => {
    // Small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      try {
        inputRef.current?.focus()
      } catch (e) {
        console.warn('Failed to focus message input:', e)
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

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
      {attachments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: verticalSpacing / 2, paddingRight: s.$075 }}
          style={{ alignSelf: 'flex-start' }}
        >
          {attachments.map((attachment, index) => (
            <View
              key={attachment.id}
              style={[styles.attachmentCardWrapper, index === 0 ? null : styles.attachmentCardSpacing]}
            >
              <View style={styles.attachmentCard}>
                <Image
                  source={{ uri: attachment.localUri }}
                  style={styles.attachmentImage}
                  contentFit="cover"
                />
              {attachment.status === 'uploading' && (
                <View style={styles.attachmentOverlay}>
                  <ActivityIndicator size="small" color={c.surface} />
                </View>
              )}
              {onAttachmentClear && (
                <Pressable
                  onPress={() => onAttachmentClear(attachment.id)}
                  hitSlop={6}
                  style={styles.attachmentClose}
                >
                  <Ionicons name="close" size={14} color={c.surface} />
                </Pressable>
              )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      <XStack
        style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}
        gap={s.$075}
      >
        {allowAttachment && (
          <Pressable
            onPress={() => {
              if (onAttachmentPress) {
                void onAttachmentPress()
              }
            }}
            hitSlop={6}
          >
            <Ionicons name="add" size={s.$2} color={c.grey2} />
          </Pressable>
        )}
        <XStack
          style={{
            backgroundColor: c.white,
            borderRadius: s.$2,
            marginVertical: verticalSpacing,
            paddingVertical: s.$09,
            paddingHorizontal: s.$1,
            justifyContent: 'space-between',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <TextInput
            ref={inputRef}
            style={{ width: '70%' }}
            placeholder="Type anything..."
            multiline={true}
            value={message}
            onChangeText={setMessage}
            autoFocus={true}
          />
          <Pressable
            onPress={() => {
              void onMessageSubmit()
            }}
            disabled={disabled}
            hitSlop={6}
          >
            <Ionicons
              name="paper-plane-outline"
              size={s.$2}
              color={disabled ? 'rgba(176,176,176,0.5)' : c.grey2}
            />
          </Pressable>
        </XStack>
      </XStack>
    </>
  )
}

const styles = StyleSheet.create({
  attachmentCardWrapper: {
    width: 76,
    height: 76,
  },
  attachmentCardSpacing: {
    marginLeft: Number(s.$075),
  },
  attachmentCard: {
    width: 76,
    height: 76,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: c.surface,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  attachmentOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentClose: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
