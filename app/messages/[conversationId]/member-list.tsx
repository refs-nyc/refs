import { useAppStore } from '@/features/stores'
import { Membership, Profile } from '@/features/types'
import { c, s } from '@/features/style'
import { Heading, XStack, YStack } from '@/ui'
import { Avatar } from '@/ui/atoms/Avatar'
import { Link, useLocalSearchParams } from 'expo-router'
import { View, Text, ScrollView } from 'react-native'
import { useEffect, useState } from 'react'

export default function MemberListScreen() {
  const { conversationId } = useLocalSearchParams()
  const { canvasApp } = useAppStore()

  const [members, setMembers] = useState<Profile[] | null>(null)

  useEffect(() => {
    async function doRefresh() {
      if (!canvasApp) return

      const memberships = await canvasApp.db.query<Membership>('membership', {
        where: { conversation: conversationId },
      })

      const members = []
      for (const membership of memberships) {
        const member = await canvasApp.db.get<Profile>('profile', membership.user as string)
        if (member) members.push(member)
      }

      setMembers(members)
    }
    doRefresh()
  }, [canvasApp])

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
