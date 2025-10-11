import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/features/stores'
import type { Profile } from '@/features/types'
import { c, s } from '@/features/style'
import { Avatar } from '@/ui/atoms/Avatar'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

export default function MemberListScreen() {
  const { conversationId } = useLocalSearchParams()
  const {
    memberships,
    conversations,
    user,
    setProfileNavIntent,
    leaveConversation,
  } = useAppStore()
  const [leaving, setLeaving] = useState(false)
  const insets = useSafeAreaInsets()

  const conversationKey = Array.isArray(conversationId) ? conversationId[0] : conversationId
  const conversation = conversationKey ? conversations[conversationKey] : undefined
  const membershipRecords = conversationKey ? memberships[conversationKey] || [] : []

  const members = useMemo(() => {
    return membershipRecords
      .map((membership) => membership.expand?.user)
      .filter(Boolean) as Profile[]
  }, [membershipRecords])

  useEffect(() => {
    if (!conversationKey) return
    if (!membershipRecords.length) return
    if (!user?.id) return
    const stillMember = membershipRecords.some((m) => m.expand?.user.id === user.id)
    if (!stillMember) {
      router.replace('/messages')
    }
  }, [conversationKey, membershipRecords, user?.id])

  const handleBack = () => {
    router.back()
  }

  const handleMemberPress = (member: Profile) => {
    if (!member?.userName) return
    setProfileNavIntent({ targetPagerIndex: 0, source: 'messages' })
    router.push(`/user/${member.userName}`)
  }

  const confirmLeave = () => {
    if (!conversationKey || !user?.id || leaving) return
    Alert.alert(
      'Leave chat?',
      'You will stop receiving messages from this group.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setLeaving(true)
              await leaveConversation(conversationKey, user.id)
              router.replace('/messages')
            } catch (error) {
              setLeaving(false)
            }
          },
        },
      ]
    )
  }

  const title = conversation?.title || 'Group chat'

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: c.surface }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: s.$075,
            paddingHorizontal: s.$1 + 6,
          }}
        >
          <Pressable onPress={handleBack} style={{ paddingRight: s.$05, paddingVertical: s.$05 }}>
            <Ionicons name="chevron-back" size={18} color={c.muted} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: c.grey2,
                fontSize: s.$09,
                fontWeight: '600',
                textAlign: 'center',
                letterSpacing: 0.2,
              }}
            >
              Members
            </Text>
            <Text
              style={{
                color: c.grey2,
                fontSize: s.$09,
                fontWeight: '600',
                textAlign: 'center',
              }}
              numberOfLines={2}
            >
              {title}
            </Text>
          </View>
          <View style={{ width: 32 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: s.$1 + 6,
          paddingTop: 5,
          paddingBottom: Math.max(insets.bottom, s.$1) + (s.$3 as number),
        }}
        showsVerticalScrollIndicator={false}
      >
        {members.map((member) => {
          const displayName = member.firstName || member.name || member.userName || 'Member'
          const subtitle = member.location || (member.userName ? `@${member.userName}` : '')
          const isCurrentUser = member.id === user?.id

          return (
            <Pressable
              key={member.id}
              onPress={() => handleMemberPress(member)}
              disabled={!member.userName}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: s.$09,
              }}
            >
              <Avatar
                source={member.image || (member as any)?.avatar_url}
                fallback={member.firstName || member.name || member.userName}
                size={s.$4}
              />
              <View style={{ marginLeft: s.$075, flex: 1 }}>
                <Text style={{ fontSize: s.$1, fontWeight: '600', color: c.muted2 }} numberOfLines={1}>
                  {displayName}
                </Text>
                {!!subtitle && (
                  <Text style={{ color: c.grey1, fontSize: s.$09 }} numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}
              </View>
              {isCurrentUser && (
                <View
                  style={{
                    paddingHorizontal: s.$05,
                    paddingVertical: 2,
                    borderRadius: s.$05,
                    backgroundColor: c.surface2,
                  }}
                >
                  <Text style={{ color: c.grey1, fontSize: s.$08 }}>You</Text>
                </View>
              )}
            </Pressable>
          )
        })}

        {!members.length && (
          <View style={{ alignItems: 'center', paddingVertical: s.$2 }}>
            <ActivityIndicator color={c.grey1} />
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: s.$1 + 6, paddingBottom: insets.bottom + (s.$1 as number) }}>
        <Pressable
          onPress={confirmLeave}
          disabled={leaving}
          style={{
            backgroundColor: c.surface2,
            borderRadius: s.$1,
            paddingVertical: s.$09,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: s.$05,
            opacity: leaving ? 0.7 : 1,
          }}
        >
          {leaving && <ActivityIndicator color={c.accent} size="small" />}
          <Text style={{ color: c.accent, fontWeight: '700' }}>Leave chat</Text>
        </Pressable>
      </View>
    </View>
  )
}
