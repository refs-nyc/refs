import React, { useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { FeedEntry } from '@/features/stores/feed'
import { formatRelativeTime } from './formatRelativeTime'
import { Avatar } from '@/ui/atoms/Avatar'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { Heading, Text, XStack } from '@/ui'
import { c, s } from '@/features/style'

const DEFAULT_AVATAR_SIZE = 44
const DEFAULT_REF_IMAGE_SIZE = 60

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

  const imageContent = refImage ? (
    <SimplePinataImage
      originalSource={refImage}
      imageOptions={{ width: refImageSize, height: refImageSize }}
      style={{
        width: refImageSize,
        height: refImageSize,
        borderRadius: 10,
        backgroundColor: c.accent,
      }}
    />
  ) : (
    <View
      style={{
        width: refImageSize,
        height: refImageSize,
        borderRadius: 10,
        backgroundColor: '#E2E2E2',
      }}
    />
  )

  const imageNode = onPressRow ? (
    <View
      style={{
        minWidth: refImageSize,
        minHeight: refImageSize,
        borderRadius: 10,
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
          borderRadius: 10,
          overflow: 'hidden',
          backgroundColor: refImage ? c.accent : 'transparent',
        }}
      >
        {imageContent}
      </View>
    </Pressable>
  )

  const containerStyle = {
    paddingVertical: 12,
    width: '100%',
  } as const

  const rowContent = (
    <XStack
      gap={12}
      style={{
        alignItems: 'flex-start',
        width: '100%',
        justifyContent: 'space-between',
      }}
    >
      {actorNode}

      <View style={{ overflow: 'hidden', flex: 1 }}>
        <Text style={{ marginBottom: 4, lineHeight: 22 }}>
          {onPressRow ? (
            <Text style={{ fontSize: 16, fontWeight: '600', color: c.black }}>{entry.actor.displayName}</Text>
          ) : (
            <Text onPress={handlePressActor} style={{ fontSize: 16, fontWeight: '600', color: c.black }}>
              {entry.actor.displayName}
            </Text>
          )}
          <Text style={{ fontSize: 15, color: c.muted2, fontWeight: '400' }}> {verb} </Text>
          {entry.ref && (
            onPressRow ? (
              <Text style={{ fontSize: 16, fontWeight: '600', color: c.black }}>{entry.ref.title}</Text>
            ) : (
              <Text onPress={handlePressRef} style={{ fontSize: 16, fontWeight: '600', color: c.black }}>
                {entry.ref.title}
              </Text>
            )
          )}
        </Text>
        {timestamp ? (
          <Text style={{ fontSize: 13, color: c.muted }}>{timestamp}</Text>
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
