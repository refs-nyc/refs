import { useMessageStore } from '@/features/pocketbase/stores/messages'
import { Profile } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { Heading, XStack, YStack } from '@/ui'
import { Avatar } from '@/ui/atoms/Avatar'
import { Ionicons } from '@expo/vector-icons'
import { Link, router, useLocalSearchParams } from 'expo-router'
import { View, Text, Pressable, ScrollView } from 'react-native'

export default function MemberListScreen() {
  const { conversationId } = useLocalSearchParams()
  const { memberships, conversations } = useMessageStore()

  const conversation = conversations[conversationId as string]
  const members = memberships[conversationId as string].map((m) => m.expand?.user) as Profile[]

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <YStack
        gap={s.$1}
        style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'start', paddingTop: s.$5 }}
      >
        <XStack
          gap={s.$1}
          style={{ alignItems: 'center', padding: s.$3, paddingTop: s.$7, width: '100%' }}
        >
          <Pressable
            onPress={() => {
              router.dismissTo(`/messages/${conversationId}`)
            }}
          >
            <Ionicons name="chevron-back" size={s.$2} color={c.grey2} />
          </Pressable>
          <Heading tag="h2semi">{conversation.title}</Heading>
        </XStack>
        <ScrollView>
          <YStack
            gap={s.$1}
            style={{
              flex: 1,
              alignItems: 'flex-start',
              justifyContent: 'start',
              paddingHorizontal: s.$4,
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
