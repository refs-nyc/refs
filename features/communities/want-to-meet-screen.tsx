import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppStore } from '@/features/stores'
import SwipeableUser from '@/ui/atoms/SwipeableUser'
import { s, c } from '@/features/style'

export function WantToMeetScreen() {
  const { saves, removeSave, user, openDMComposer } = useAppStore()
  const savedUsers = useMemo(() => saves.map((s) => s.expand.user), [saves])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const selectedUsers = useMemo(() => savedUsers.filter((u: any) => selected[u.id]), [selected, savedUsers])
  const insets = useSafeAreaInsets()

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showToast = (name: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToastMessage(`Message sent to ${name}`)
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000)
  }

  const handleDmPress = () => {
    if (!(selectedUsers.length === 1 && user?.id)) return
    const target = selectedUsers[0]
    openDMComposer(target, {
      onSuccess: (profile) => {
        const displayName = profile.firstName || profile.name || 'user'
        showToast(displayName)
      },
    })
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {/* Header with subheader and inline + */}
      <View style={{ paddingVertical: s.$1, justifyContent: 'center', marginTop: 7, paddingLeft: s.$1 + 6, paddingRight: s.$1 + 6, marginBottom: -5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'column' }}>
            <Text style={{ color: c.prompt, fontSize: (s.$09 as number) + 4, fontFamily: 'System', fontWeight: '700', textAlign: 'left', lineHeight: s.$1half }}>
              {`Want to Meet (${savedUsers.length})`}
            </Text>
            <Text style={{ color: c.prompt, fontSize: s.$09, fontFamily: 'System', fontWeight: '400', textAlign: 'left', lineHeight: s.$1half }}>
              Select anyone to DM or start a group chat
            </Text>
          </View>
        </View>
      </View>

      {/* Saved list */}
      <View style={{ flex: 1, paddingHorizontal: s.$1 + 6 }}>
        <ScrollView contentContainerStyle={{ paddingTop: s.$075, paddingBottom: s.$10 }}>
          {savedUsers.map((u: any, idx: number) => (
            <View key={u.id} style={{ marginBottom: idx === savedUsers.length - 1 ? 0 : s.$075 }}>
              <SwipeableUser
                onActionPress={async () => {
                  try {
                    const match = saves.find((s) => s.user === u.id || s.expand?.user?.id === u.id)
                    if (!match?.id) return
                    await removeSave(match.id)
                  } catch (e) {}
                }}
                user={u}
                backgroundColor={selected[u.id] ? c.olive : c.surface2}
                whiteText={!!selected[u.id]}
                onPress={() => setSelected((prev) => ({ ...prev, [u.id]: !prev[u.id] }))}
              />
            </View>
          ))}
          {savedUsers.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: s.$3 }}>
              <Text style={{ color: c.muted }}>No saved users yet.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Action buttons */}
      <View style={{ position: 'absolute', left: s.$1 + 6, right: s.$1 + 6, bottom: insets.bottom + (s.$3 as number) }}>
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
          <View style={{ flex: 1, opacity: selectedUsers.length >= 1 ? 1 : 0.5 }}>
            <View style={{ borderWidth: 1, borderColor: c.olive, borderRadius: s.$075, paddingVertical: s.$075, alignItems: 'center' }}>
              <Text style={{ color: c.olive }}>+ Group</Text>
            </View>
          </View>
        </View>
      </View>

      {toastMessage && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={{ position: 'absolute', left: s.$1 + 6, right: s.$1 + 6, bottom: insets.bottom + 40 }}
        >
          <View
            style={{
              backgroundColor: c.surface2,
              paddingVertical: s.$075,
              paddingHorizontal: s.$1,
              borderRadius: s.$075,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <Text style={{ color: c.muted2 }}>{toastMessage}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  )
}
