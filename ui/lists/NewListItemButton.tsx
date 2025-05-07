import { XStack } from '../core/Stacks'
import { View, Text, Pressable } from 'react-native'
import { useState, useEffect } from 'react'
import Ionicons from '@expo/vector-icons/Ionicons'
import { pocketbase } from '@/features/pocketbase'
import { s, c, base } from '@/features/style'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import type { CompleteRef } from '@/features/pocketbase/stores/types'

export const NewListItemButton = ({ onPress }: { onPress: () => void }) => {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: s.$08,
        // paddingHorizontal: s.$08,
        borderRadius: s.$075,
        backgroundColor: c.surface,
      }}
    >
      <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View
            style={[
              base.largeSquare,
              {
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: c.accent,
              },
            ]}
          >
            <Text
              style={{
                color: c.white,
                width: '100%',
                textAlign: 'center',
                fontSize: s.$2,
              }}
            >
              +
            </Text>
          </View>
          <Text>Add a ref to the list</Text>
        </XStack>
      </XStack>
    </Pressable>
  )
}
