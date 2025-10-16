import React, { useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { s, c } from '@/features/style'
import { useAppStore } from '@/features/stores'
import { CommunitiesFeedScreen } from '@/features/communities/feed-screen'
import { WantToMeetPanel } from '@/features/communities/want-to-meet-screen'
import { Badge } from '@/ui/atoms/Badge'
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming, withSequence, withSpring, Extrapolation } from 'react-native-reanimated'
import { useWantToMeet } from '@/features/queries/wantToMeet'

type DirectoryTab = 'everyone' | 'wantToMeet'

const tabs: Array<{ key: DirectoryTab; label: string }> = [
  { key: 'everyone', label: 'Everyone' },
  { key: 'wantToMeet', label: 'Want to Meet' },
]

export function CommunityInterestsScreen() {
  const { user } = useAppStore()
  const [activeTab, setActiveTab] = useState<DirectoryTab>('everyone')
  const { data: wantToMeet = [] } = useWantToMeet(user?.id)
  const insets = useSafeAreaInsets()
  const wantToMeetCount = wantToMeet.length
  const wantToMeetActive = activeTab === 'wantToMeet'
  const flipProgress = useSharedValue(0)
  const badgeScale = useSharedValue(1)

  useEffect(() => {
    flipProgress.value = withTiming(activeTab === 'wantToMeet' ? 1 : 0, { duration: 260 })
  }, [activeTab, flipProgress])

  useEffect(() => {
    badgeScale.value = withSequence(
      withTiming(0.88, { duration: 90 }),
      withSpring(1, { damping: 12, stiffness: 180 })
    )
  }, [wantToMeetCount])

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }))

  const frontStyle = useAnimatedStyle(() => ({
      transform: [
        { perspective: 800 },
        { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 90])}deg` },
      ],
      opacity: interpolate(flipProgress.value, [0, 0.5, 1], [1, 0, 0], Extrapolation.CLAMP),
  }))

  const backStyle = useAnimatedStyle(() => ({
      transform: [
        { perspective: 800 },
        { rotateY: `${interpolate(flipProgress.value, [0, 1], [-90, 0])}deg` },
      ],
      opacity: interpolate(flipProgress.value, [0, 0.5, 1], [0, 0, 1], Extrapolation.CLAMP),
  }))

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <View style={{ paddingHorizontal: s.$1 + 6, paddingTop: s.$1 + 6 }}>
        <Text style={{ color: c.newDark, fontSize: (s.$09 as number) + 6, fontFamily: 'InterBold', fontWeight: '700', marginBottom: 4 }}>
          Edge Directory
        </Text>
        <View style={{ height: (s.$05 as number) + 3 }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key
        return (
          <Pressable
                key={tab.key}
                onPress={() => {
                  if (tab.key === activeTab) return
                  setActiveTab(tab.key)
                }}
                style={{
                  minWidth: 0,
                  paddingVertical: 4,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: active ? c.accent : 'rgba(165,184,159,0.5)',
                  backgroundColor: active ? c.accent : 'transparent',
                  position: 'relative',
                }}
              >
                <Text
                  style={{
                    fontSize: (s.$09 as number) - 3,
                    fontWeight: '700',
                    color: active ? c.surface : c.accent,
                    opacity: active ? 1 : 0.5,
                  }}
                >
                  {tab.label}
              </Text>
                {tab.key === 'wantToMeet' && (
                  <Animated.View style={[{ position: 'absolute', top: -6, right: -1, opacity: 1 }, badgeAnimatedStyle]}>
                    <Badge count={wantToMeetCount} color="#7e8f78" />
                  </Animated.View>
                )}
                  </Pressable>
                )
              })}
            </View>
      </View>

      <View style={{ flex: 1, marginTop: s.$1, paddingHorizontal: s.$1 + 6 }}>
        <Animated.View
          style={[
            { flex: 1, backfaceVisibility: 'hidden' as any },
            frontStyle,
            { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
          ]}
          pointerEvents={wantToMeetActive ? 'none' : 'auto'}
        >
          <CommunitiesFeedScreen
            showHeader={false}
            hideInterestChips
            embedded
            embeddedPadding={(s.$1 as number) + 6}
          />
        </Animated.View>
          <Animated.View
          style={[
            { flex: 1, backfaceVisibility: 'hidden' as any },
            backStyle,
            { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
          ]}
          pointerEvents={wantToMeetActive ? 'auto' : 'none'}
        >
          <WantToMeetPanel
              showHeader={false}
            showActions
            containerStyle={{ flex: 1, paddingTop: 0, paddingBottom: insets.bottom + (s.$4 as number) }}
            headerTitle="Want to Meet"
          />
        </Animated.View>
      </View>
    </View>
  )
}
