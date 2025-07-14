import { useAppStore } from '@/features/stores'
import { Profile } from '@/features/pocketbase/types'
import { c, s } from '@/features/style'
import { Heading, XStack, YStack } from '@/ui'
import { Avatar } from '@/ui/atoms/Avatar'
import { Ionicons } from '@expo/vector-icons'
import { Link, router, useLocalSearchParams } from 'expo-router'
import { View, Text, Pressable, ScrollView } from 'react-native'

export default function MemberListScreen() {
  const { conversationId } = useLocalSearchParams()
  const { memberships, conversations } = useAppStore()

  const conversation = conversations[conversationId as string]
  const members = memberships[conversationId as string].map((m) => m.expand?.user) as Profile[]

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
            {members.map((m) => (
              <View key={m.id}>
                <Link href={`/user/${m.userName}`}>
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
