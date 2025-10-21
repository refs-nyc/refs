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
  onPressRef?: (entry: FeedEntry) => void | Promise<void>
  onPressImage?: (entry: FeedEntry) => void | Promise<void>
  onPressActor?: (entry: FeedEntry) => void | Promise<void>
  onPressRow?: (entry: FeedEntry) => void | Promise<void>
  avatarSize?: number
  refImageSize?: number
}

export const FeedRow: React.FC<FeedRowProps> = ({
  entry,
  onPressRef,
  onPressImage,
  onPressActor,
  onPressRow,
  avatarSize = DEFAULT_AVATAR_SIZE,
  refImageSize = DEFAULT_REF_IMAGE_SIZE,
}) => {
  const verb = entry.kind === 'interest_join' ? 'joined' : 'added'
  const timestamp = useMemo(() => formatRelativeTime(entry.created), [entry.created])

  const handlePressRef = () => {
    void onPressRef?.(entry)
  }

  const handlePressImage = () => {
    void onPressImage?.(entry)
  }

  const handlePressActor = () => {
    void onPressActor?.(entry)
  }

  const refImage = entry.ref?.image

  const actorNode = onPressRow ? (
    <View>
      <Avatar source={entry.actor.avatar} fallback={entry.actor.displayName} size={avatarSize} />
    </View>
  ) : (
    <Pressable onPress={handlePressActor} hitSlop={8}>
      <View>
        <Avatar source={entry.actor.avatar} fallback={entry.actor.displayName} size={avatarSize} />
      </View>
    </Pressable>
  )

  const nameNode = onPressRow ? (
    <View style={{ marginRight: 4 }}>
      <Heading tag="semistrong">{entry.actor.displayName}</Heading>
    </View>
  ) : (
    <Pressable onPress={handlePressActor} hitSlop={4} style={{ marginRight: 4 }}>
      <Heading tag="semistrong">{entry.actor.displayName}</Heading>
    </Pressable>
  )

  const refNode =
    entry.ref &&
    (onPressRow ? (
      <View>
        <Heading tag="semistrong">{entry.ref.title}</Heading>
      </View>
    ) : (
      <Pressable onPress={handlePressRef} hitSlop={4}>
        <Heading tag="semistrong">{entry.ref.title}</Heading>
      </Pressable>
    ))

  const imageContent = refImage ? (
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
  )

  const imageNode = onPressRow ? (
    <View
      style={{
        minWidth: refImageSize,
        minHeight: refImageSize,
        borderRadius: s.$075,
        overflow: 'hidden',
        backgroundColor: refImage ? c.accent : 'transparent',
      }}
    >
      {imageContent}
    </View>
  ) : (
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
        {imageContent}
      </View>
    </Pressable>
  )

  const containerStyle = {
    paddingVertical: 10,
    width: '100%',
    marginBottom: 6,
  } as const

  const rowContent = (
    <XStack
      gap={s.$08}
      style={{
        alignItems: 'center',
        width: '100%',
        justifyContent: 'space-between',
      }}
    >
      {actorNode}

      <View style={{ overflow: 'hidden', flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {nameNode}
          <Text style={{ fontSize: 16, color: c.muted2, marginRight: 4 }}>{verb}</Text>
          {refNode}
        </View>
        {timestamp ? (
          <Text style={{ fontSize: 12, color: c.muted, paddingTop: 2 }}>{timestamp}</Text>
        ) : null}
      </View>

      {imageNode}
    </XStack>
  )

  if (onPressRow) {
    return (
      <Pressable onPress={() => onPressRow(entry)} hitSlop={6} style={containerStyle}>
        {rowContent}
      </Pressable>
    )
  }

  return <View style={containerStyle}>{rowContent}</View>
}
