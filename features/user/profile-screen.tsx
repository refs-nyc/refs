import { Profile } from '@/ui'
import React, { useEffect, useMemo, useRef } from 'react'
import { Dimensions, View, ScrollView } from 'react-native'
import { useAppStore } from '@/features/stores'
import { CommunitiesFeedScreen } from '@/features/communities/feed-screen'
import { c } from '@/features/style'

export function UserProfileScreen({ userName }: { userName: string }) {
  if (!userName) {
    return null
  }

  const { homePagerIndex, setHomePagerIndex, user, returnToDirectories, setReturnToDirectories } = useAppStore()
  const { width } = Dimensions.get('window')
  const scrollRef = useRef<ScrollView>(null)

  // Keep scroll position in sync when index changes programmatically
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: homePagerIndex * width, y: 0, animated: false })
  }, [homePagerIndex, width])

  // Always default to My Profile (index 0) when opening own profile
  useEffect(() => {
    if (user?.userName === userName && homePagerIndex !== 0) {
      setHomePagerIndex(0)
    }
  }, [user?.userName, userName])

  // If we navigated back from a directory-tapped profile, force pager to Directories
  useEffect(() => {
    if (returnToDirectories) {
      setHomePagerIndex(1)
      setReturnToDirectories(false)
    }
  }, [returnToDirectories])

  const Dots = useMemo(() => {
    return (
      <View
        style={{
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[0, 1].map((i) => (
            <View
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 100,
                backgroundColor: i === homePagerIndex ? c.grey2 : c.grey1,
              }}
            />
          ))}
        </View>
      </View>
    )
  }, [homePagerIndex])

  // Only enable pager on own profile; other users render normally
  if (user?.userName !== userName) {
    return <Profile userName={userName} />
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <ScrollView
        style={{ backgroundColor: c.surface }}
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width)
          if (next !== homePagerIndex) setHomePagerIndex(next)
        }}
      >
        <View style={{ width, backgroundColor: c.surface }}>
          <Profile userName={userName} />
        </View>
        <View style={{ width, backgroundColor: c.surface }}>
          <CommunitiesFeedScreen />
        </View>
      </ScrollView>
      {Dots}
    </View>
  )
}
