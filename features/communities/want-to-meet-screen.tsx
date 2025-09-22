import React, { useMemo } from 'react'
import { View, Text, Dimensions, ScrollView, Pressable } from 'react-native'
import { s, c } from '@/features/style'
import { useAppStore } from '@/features/stores'
import SwipeableUser from '@/ui/atoms/SwipeableUser'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const win = Dimensions.get('window')

export function WantToMeetScreen() {
  const { saves, removeSave, user, createConversation, setMessagesForConversation, setOldestLoadedMessageDate } = useAppStore()
  const savedUsers = useMemo(() => saves.map((s) => s.expand.user), [saves])
  const [selected, setSelected] = React.useState<Record<string, boolean>>({})
  const selectedUsers = useMemo(() => savedUsers.filter((u: any) => selected[u.id]), [selected, savedUsers])
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {/* Header with subheader and inline + */}
      <View style={{ paddingVertical: s.$1, justifyContent: 'center', marginTop: 7, paddingLeft: s.$1 + 6, paddingRight: s.$1 + 6, marginBottom: -5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'column' }}>
            <Text style={{ color: c.prompt, fontSize: (s.$09 as number) + 4, fontFamily: 'System', fontWeight: '700', textAlign: 'left', lineHeight: s.$1half }}>
              {`Want to Meet (${savedUsers.length})`}
            </Text>
            {/* Subheader matches saves bottom sheet copy */}
            <Text style={{ color: c.prompt, fontSize: s.$09, fontFamily: 'System', fontWeight: '400', textAlign: 'left', lineHeight: s.$1half }}>
              Select anyone to DM or start a group chat
            </Text>
          </View>
        </View>
      </View>

      {/* Saved list */}
      <View style={{ flex: 1, paddingHorizontal: s.$1 + 6 }}>
        <ScrollView contentContainerStyle={{ paddingTop: s.$075, paddingBottom: s.$10 }}>
          {savedUsers.map((user: any, idx: number) => (
            <View key={user.id} style={{ marginBottom: idx === savedUsers.length - 1 ? 0 : s.$075 }}>
              <SwipeableUser
                onActionPress={async () => {
                  try {
                    const match = saves.find((s) => s.user === user.id || s.expand?.user?.id === user.id)
                    if (!match?.id) return
                    await removeSave(match.id)
                  } catch (e) {
                    // no-op; leave UI unchanged if deletion fails
                  }
                }}
                user={user}
                backgroundColor={selected[user.id] ? c.olive : c.surface2}
                whiteText={!!selected[user.id]}
                onPress={() => setSelected((prev) => ({ ...prev, [user.id]: !prev[user.id] }))}
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
      {/* Action buttons like Saves */}
      <View style={{ position: 'absolute', left: s.$1 + 6, right: s.$1 + 6, bottom: insets.bottom + (s.$3 as number) }}>
        <View style={{ flexDirection: 'row', gap: s.$1, justifyContent: 'center' }}>
          {/* DM single */}
          <Pressable
            disabled={!(selectedUsers.length === 1 && user?.id)}
            onPress={async () => {
              try {
                if (!(selectedUsers.length === 1 && user?.id)) return
                const target = selectedUsers[0]
                const convoId = await createConversation(true, user.id, [target.id])
                // Initialize empty message array and a baseline oldestLoaded date
                try {
                  setMessagesForConversation(convoId, [])
                  setOldestLoadedMessageDate(convoId, new Date().toISOString())
                } catch {}
                // optional: navigate to messages (if router available)
                try { (await import('expo-router')).router.push(`/messages/${convoId}`) } catch {}
              } catch {}
            }}
            style={{ flex: 1, opacity: selectedUsers.length === 1 ? 1 : 0.5 }}
          >
            <View style={{ backgroundColor: c.olive, borderRadius: s.$075, paddingVertical: s.$075, alignItems: 'center' }}>
              <Text style={{ color: c.white }}>DM</Text>
            </View>
          </Pressable>
          {/* Group */}
          <View style={{ flex: 1, opacity: selectedUsers.length >= 1 ? 1 : 0.5 }}>
            <View style={{ borderWidth: 1, borderColor: c.olive, borderRadius: s.$075, paddingVertical: s.$075, alignItems: 'center' }}>
              <Text style={{ color: c.olive }}>+ Group</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}


