import React from 'react'
import { View } from 'react-native'
import { SearchLoadingSpinner } from './SearchLoadingSpinner'
import { useAppStore } from '@/features/stores'
import { c } from '@/features/style'

export const StartupLoadingIndicator = () => {
  const { isBackgroundLoading } = useAppStore()

  if (!isBackgroundLoading) {
    return null
  }

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: c.surface,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      <SearchLoadingSpinner size={60} />
    </View>
  )
} 