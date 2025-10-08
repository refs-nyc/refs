import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleProp, ViewStyle } from 'react-native'
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppStore } from '@/features/stores'
import UserListItem from '@/ui/atoms/UserListItem'
import { s, c } from '@/features/style'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import type { Profile } from '@/features/types'
import { EdgeCorkboardScreen } from '@/features/communities/corkboard-screen'

type WantToMeetPanelProps = {
  showHeader?: boolean
  headerTitle?: string
  subHeader?: string
  containerStyle?: StyleProp<ViewStyle>
  showActions?: boolean
}

export function WantToMeetPanel({
  showHeader = true,
  headerTitle = 'Want to Meet',
  subHeader = 'Select anyone to DM or start a group chat',
  containerStyle,
  showActions = true,
}: WantToMeetPanelProps) {
  const { saves, removeSave, user, openDMComposer, openGroupComposer, setProfileNavIntent } = useAppStore()
  const savedUsers = useMemo<Profile[]>(() => saves.map((s) => s.expand.user as Profile), [saves])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const selectedUsers = useMemo(
    () => savedUsers.filter((u) => (u?.id ? selected[u.id] : false)),
    [selected, savedUsers]
  )
  const insets = useSafeAreaInsets()

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countScale = useSharedValue(1)
  const countAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countScale.value }],
  }))

  useEffect(() => {
    countScale.value = withSequence(
      withTiming(0.92, { duration: 90 }),
      withSpring(1, { damping: 12, stiffness: 180 })
    )
  }, [savedUsers.length])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToastMessage(message)
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000)
  }

  const handleDmPress = () => {
    if (!(selectedUsers.length === 1 && user?.id)) return
    const target = selectedUsers[0]
    openDMComposer(target, {
      onSuccess: (profile) => {
        const displayName = profile.firstName || profile.name || 'user'
        showToast(`Message sent to ${displayName}`)
      },
    })
  }

  const handleGroupPress = () => {
    if (selectedUsers.length < 2) return
    openGroupComposer(selectedUsers, {
      onSuccess: ({ title }) => {
        setSelected({})
        const displayTitle = title?.trim() || 'Group chat'
        showToast(`Group chat "${displayTitle}" created`)
      },
    })
  }

  return (
    <View style={[{ flex: 1, backgroundColor: c.surface }, containerStyle]}>
      {showHeader && (
        <View style={{ paddingVertical: s.$1, justifyContent: 'center', marginTop: 7, paddingLeft: s.$1 + 6, paddingRight: s.$1 + 6, marginBottom: -5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'column' }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={{ color: c.prompt, fontSize: (s.$09 as number) + 4, fontFamily: 'System', fontWeight: '700', textAlign: 'left', lineHeight: s.$1half }}>
                  {headerTitle}
                </Text>
                {showActions ? (
                  <Animated.Text
                    style={[
                      {
                        color: c.newDark,
                        fontSize: (s.$09 as number) + 2,
                        fontFamily: 'System',
                        fontWeight: '600',
                      },
                      countAnimatedStyle,
                    ]}
                  >
                    {`(${savedUsers.length})`}
                  </Animated.Text>
                ) : null}
              </View>
              <Text style={{ color: c.prompt, fontSize: s.$09, fontFamily: 'System', fontWeight: '400', textAlign: 'left', lineHeight: s.$1half }}>
                {subHeader}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ flex: 1, paddingHorizontal: s.$1 + 6 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: s.$075,
            paddingBottom: showActions
              ? insets.bottom + (s.$4 as number)
              : (s.$1 as number) * 2,
          }}
        >
          {savedUsers.map((u, idx) => {
            const isSelected = !!selected[u.id]
            const matchingSave = saves.find((s) => s.user === u.id || s.expand?.user?.id === u.id)

            return (
              <View key={u.id} style={{ marginBottom: idx === savedUsers.length - 1 ? 0 : s.$075, position: 'relative' }}>
                <UserListItem
                  user={u}
                  onPress={() => setSelected((prev) => ({ ...prev, [u.id]: !prev[u.id] }))}
                  small={false}
                  whiteText={isSelected}
                  primaryColor={isSelected ? c.surface : c.black}
                  secondaryColor={isSelected ? c.surface : c.newDark}
                  style={{
                    backgroundColor: isSelected ? c.olive : c.surface2,
                    paddingVertical: s.$075,
                    paddingHorizontal: s.$075,
                  }}
                />
                {isSelected && u.userName && (
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation()
                      setProfileNavIntent({ targetPagerIndex: 0, source: 'wantToMeet' })
                      router.push(`/user/${u.userName}`)
                    }}
                    style={{
                      position: 'absolute',
                      right: matchingSave?.id ? (s.$2 as number) + 12 : s.$075,
                      top: 0,
                      bottom: 0,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="arrow-forward" size={s.$1 as number} color={c.grey1} />
                  </Pressable>
                )}
                {isSelected && matchingSave?.id && (
                  <Pressable
                    onPress={async (event) => {
                      event.stopPropagation()
                      try {
                        await removeSave(matchingSave.id)
                      } catch (e) {}
                    }}
                    style={{
                      position: 'absolute',
                      right: -4,
                      top: -8,
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: 4,
                    }}
                  >
                    <View
                      style={{
                        width: s.$2 as number,
                        height: s.$2 as number,
                        borderRadius: (s.$2 as number) / 2,
                        backgroundColor: c.surface,
                        borderWidth: 1,
                        borderColor: c.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="close" size={s.$1 as number} color={c.grey1} />
                    </View>
                  </Pressable>
                )}
              </View>
            )
          })}
          {savedUsers.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: s.$3 }}>
              <Text style={{ color: c.muted }}>No saved users yet.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {showActions && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: s.$1 + 6,
            right: s.$1 + 6,
            bottom: insets.bottom + (s.$3 as number),
            paddingBottom: s.$05,
          }}
        >
          <View
            style={{
              backgroundColor: c.surface,
              paddingTop: s.$1-5,
              paddingBottom: s.$05,
              width: '100%',
            }}
          >
            <View style={{ flexDirection: 'row', gap: s.$1, justifyContent: 'center' }}>
              <Pressable
                disabled={!(selectedUsers.length === 1 && user?.id)}
                onPress={handleDmPress}
                style={{ flex: 1, opacity: selectedUsers.length === 1 ? 1 : 0.5 }}
              >
                <View style={{ backgroundColor: c.olive, borderRadius: s.$075, paddingVertical: s.$075, alignItems: 'center' }}>
                  <Text style={{ color: c.white }}>DM</Text>
                </View>
              </Pressable>
              <Pressable
                disabled={selectedUsers.length < 2}
                onPress={handleGroupPress}
                style={{ flex: 1, opacity: selectedUsers.length >= 2 ? 1 : 0.5 }}
              >
                <View style={{ borderWidth: 1, borderColor: c.olive, borderRadius: s.$075, paddingVertical: s.$075, alignItems: 'center' }}>
                  <Text style={{ color: c.olive }}>+ Group</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {showActions && toastMessage && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={{ position: 'absolute', left: 10, right: 10, bottom: insets.bottom + 35 }}
        >
          <Pressable
            onPress={() => {
              setToastMessage(null)
              router.navigate('/messages')
            }}
            style={{
              backgroundColor: c.accent,
              paddingVertical: s.$1,
              paddingHorizontal: s.$1,
              borderRadius: s.$075 + 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <Text style={{ color: c.surface, fontWeight: '700', fontSize: (s.$09 as number) + 2 }}>
              {toastMessage}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={c.surface} />
          </Pressable>
        </Animated.View>
      )}
    </View>
  )
}

export function WantToMeetScreen() {
  return <EdgeCorkboardScreen />
}
