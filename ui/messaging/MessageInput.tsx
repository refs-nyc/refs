import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'

import { c, s } from '@/features/style'
import { Message, Profile } from '@/features/types'

import { XStack, YStack } from '../core/Stacks'

export type MessageInputHandle = {
  focus: () => void
}

type MessageInputProps = {
  onMessageSubmit: () => void | Promise<void>
  setMessage: (text: string) => void
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
}

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
  (
    {
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
    },
    ref
  ) => {
    const verticalSpacing = compact ? s.$05 : s.$075
    const inputRef = useRef<TextInput>(null)

    const logEvent = (label: string) => {
      if (__DEV__) {
        console.log(`[message-input] ${label}`, Date.now())
      }
    }

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          requestAnimationFrame(() => {
            inputRef.current?.focus()
          })
          logEvent('focus() called')
        },
      }),
      []
    )

    useEffect(() => {
      const timer = setTimeout(() => {
        try {
          logEvent('auto-focus timer')
          inputRef.current?.focus()
        } catch (error) {
          console.warn('Failed to focus message input:', error)
        }
      }, 100)

      return () => clearTimeout(timer)
    }, [])

    return (
      <>
        {parentMessage && (
          <View style={styles.replyContainer}>
            <XStack style={styles.replyHeader}>
              <YStack>
                <Text style={styles.replyTitle}>
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
            contentContainerStyle={{
              paddingVertical: verticalSpacing / 2,
              paddingRight: s.$075,
            }}
            style={{ alignSelf: 'flex-start' }}
          >
            {attachments.map((attachment, index) => (
              <View
                key={attachment.id}
                style={[
                  styles.attachmentCardWrapper,
                  index === 0 ? null : styles.attachmentCardSpacing,
                ]}
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

        <XStack style={styles.composerRow} gap={s.$075}>
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
            style={[
              styles.inputContainer,
              {
                marginVertical: verticalSpacing,
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Type anything..."
              multiline
              value={message}
              onChangeText={setMessage}
              autoFocus
              onBlur={() => {
                logEvent('onBlur')
              }}
              onFocus={() => {
                logEvent('onFocus')
              }}
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
)

MessageInput.displayName = 'MessageInput'

export default MessageInput

const styles = StyleSheet.create({
  replyContainer: {
    backgroundColor: c.surface2,
    padding: s.$1,
    borderRadius: s.$2,
  },
  replyHeader: {
    justifyContent: 'space-between',
  },
  replyTitle: {
    fontWeight: 'bold',
  },
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
  composerRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    backgroundColor: c.white,
    borderRadius: s.$2,
    paddingVertical: s.$09,
    paddingHorizontal: s.$1,
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  input: {
    flex: 1,
  },
})
