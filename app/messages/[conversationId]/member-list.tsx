import { useAppStore } from '@/features/stores'
import { c, s } from '@/features/style'
import { Heading, XStack, YStack } from '@/ui'
import { Avatar } from '@/ui/atoms/Avatar'
import { Link, useLocalSearchParams } from 'expo-router'
import { View, Text, ScrollView } from 'react-native'
import { useMemo } from 'react'

export default function MemberListScreen() {
  const { conversationId } = useLocalSearchParams()
  const { profilesByUserDid, membershipsByConversationAndUserId } = useAppStore()

  const members = useMemo(() => {
    if (typeof conversationId !== 'string') return

    const members = []
    for (const userId of Object.keys(membershipsByConversationAndUserId[conversationId])) {
      const member = profilesByUserDid[userId as string]

      if (member) members.push(member)
    }
    return members
  }, [conversationId, profilesByUserDid, membershipsByConversationAndUserId])

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <YStack
        style={{
          flex: 1,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          paddingVertical: s.$5,
        }}
      >
        <XStack
          gap={s.$1}
          style={{
            alignItems: 'center',
            paddingBottom: s.$1,
            paddingLeft: s.$1,
            paddingTop: s.$1,
          }}
        >
          <Heading tag="h2semi">Members</Heading>
        </XStack>
        <ScrollView
          style={{
            width: '100%',
          }}
        >
          <YStack
            gap={s.$1}
            style={{
              flex: 1,
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              paddingHorizontal: s.$4,
              paddingVertical: s.$2,
            }}
          >
            {(members || []).map((m) => (
              <View key={m.did}>
                <Link href={`/user/${m.did}`}>
                  <XStack gap={s.$1}>
                    <Avatar source={m.image} size={s.$5} />
                    <YStack>
                      <Text>
                        {m.firstName} {m.lastName}
                      </Text>
                      <Text style={{ color: c.muted }}>{m.location}</Text>
                    </YStack>
                  </XStack>
                </Link>
              </View>
            ))}
          </YStack>
        </ScrollView>
      </YStack>
    </View>
  )
}
