import React, { useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { FeedEntry } from '@/features/stores/feed'
import { formatRelativeTime } from './formatRelativeTime'
import { Avatar } from '@/ui/atoms/Avatar'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { Heading, Text, XStack } from '@/ui'
import { c, s } from '@/features/style'

const DEFAULT_AVATAR_SIZE = 42
const DEFAULT_REF_IMAGE_SIZE = Math.round(DEFAULT_AVATAR_SIZE * 1.33)

export type FeedRowProps = {
  entry: FeedEntry
  onPressRef?: (entry: FeedEntry) => void
  onPressImage?: (entry: FeedEntry) => void
  onPressActor?: (entry: FeedEntry) => void
  avatarSize?: number
  refImageSize?: number
}

export const FeedRow: React.FC<FeedRowProps> = ({
  entry,
  onPressRef,
  onPressImage,
  onPressActor,
  avatarSize = DEFAULT_AVATAR_SIZE,
  refImageSize = DEFAULT_REF_IMAGE_SIZE,
}) => {
  const verb = entry.kind === 'interest_join' ? 'joined' : 'added'
  const timestamp = useMemo(() => formatRelativeTime(entry.created), [entry.created])

  const handlePressRef = () => {
    onPressRef?.(entry)
  }

  const handlePressImage = () => {
    onPressImage?.(entry)
  }

  const handlePressActor = () => {
    onPressActor?.(entry)
  }

  const refImage = entry.ref?.image

  return (
    <View
      style={{
        backgroundColor: c.surface2,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 10,
        width: '100%',
        marginBottom: 6,
      }}
    >
      <XStack
        gap={s.$08}
        style={{
          alignItems: 'center',
          width: '100%',
          justifyContent: 'space-between',
          paddingHorizontal: 10,
        }}
      >
        <Pressable onPress={handlePressActor} hitSlop={8}>
          <View>
            <Avatar
              source={entry.actor.avatar}
              fallback={entry.actor.displayName}
              size={avatarSize}
            />
          </View>
        </Pressable>

        <View style={{ overflow: 'hidden', flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <Pressable onPress={handlePressActor} hitSlop={4} style={{ marginRight: 4 }}>
              <Heading tag="semistrong">{entry.actor.displayName}</Heading>
            </Pressable>
            <Text style={{ fontSize: 16, color: c.muted2, marginRight: 4 }}>{verb}</Text>
            {entry.ref && (
              <Pressable onPress={handlePressRef} hitSlop={4}>
                <Heading tag="semistrong">{entry.ref.title}</Heading>
              </Pressable>
            )}
          </View>
          {timestamp ? (
            <Text style={{ fontSize: 12, color: c.muted, paddingTop: 2 }}>{timestamp}</Text>
          ) : null}
        </View>

        <Pressable onPress={handlePressImage} disabled={!refImage} hitSlop={4}>
          <View
            style={{
              minWidth: refImageSize,
              minHeight: refImageSize,
              borderRadius: s.$075,
              overflow: 'hidden',
              backgroundColor: refImage ? c.accent : 'transparent',
            }}
          >
            {refImage ? (
              <SimplePinataImage
                originalSource={refImage}
                imageOptions={{ width: refImageSize, height: refImageSize }}
                style={{
                  width: refImageSize,
                  height: refImageSize,
                  borderRadius: s.$075,
                  backgroundColor: c.accent,
                }}
              />
            ) : (
              <View
                style={{
                  width: refImageSize,
                  height: refImageSize,
                  borderRadius: s.$075,
                  backgroundColor: '#E2E2E2',
                }}
              />
            )}
          </View>
        </Pressable>
      </XStack>
    </View>
  )
}
