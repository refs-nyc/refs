import React from 'react'
import { View } from 'react-native'
import { CommunitiesFeedScreen } from '@/features/communities/feed-screen'

// Keeps the directory list mounted offscreen so images/data stay warm between navigations
export const DirectoryKeepAlive = () => {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }}
    >
      <CommunitiesFeedScreen />
    </View>
  )
}


