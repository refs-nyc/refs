import { Link, router, usePathname } from 'expo-router'
import { Text, View, Pressable, Animated } from 'react-native'
import { Avatar } from '../atoms/Avatar'
import { c, s } from '@/features/style'
import { useAppStore } from '@/features/stores'
import { NavigationBackdrop } from '@/ui/navigation/NavigationBackdrop'
import { Badge } from '../atoms/Badge'
import { useMemo, useRef, useEffect } from 'react'
import SavesIcon from '@/assets/icons/saves.svg'
import MessageIcon from '@/assets/icons/message.svg'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet from '@gorhom/bottom-sheet'

export const Navigation = ({
  savesBottomSheetRef,
}: {
  savesBottomSheetRef: React.RefObject<BottomSheet>
}) => {
  const pathname = usePathname()

  const { user, saves, messagesPerConversation, conversations, memberships } = useAppStore()

  const isHomePage = pathname === '/' || pathname === '/index'

  const scaleAnim = useRef(new Animated.Value(1)).current

  const animateBadge = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()
  }

  useEffect(() => {
    if (saves.length > 0) {
      animateBadge()
    }
  }, [saves.length])

  const countNewMessages = () => {
    if (!user) return 0
    if (!messagesPerConversation) return 0
    // messages not loaded yet
    if (Object.keys(memberships).length === 0) return 0
    let newMessages = 0
    for (const conversationId in conversations) {
      const membership = memberships[conversationId].find((m) => m.expand?.user.id === user?.id)
      if (!membership) continue
      if (membership?.archived) continue
      const lastRead = membership?.last_read
      const lastReadDate = new Date(lastRead || '')
      const conversationMessages = messagesPerConversation[conversationId]
      if (!conversationMessages) continue
      let unreadMessages
      if (lastRead) {
        const msgs = conversationMessages.filter(
          (m) => new Date(m.created!) > lastReadDate && m.sender !== user?.id
        )
        unreadMessages = msgs.length
      } else unreadMessages = conversationMessages.length
      newMessages += unreadMessages
    }
    return newMessages
  }
  const newMessages = useMemo(
    () => countNewMessages(),
    [messagesPerConversation, memberships, user]
  )

  if (!user) return null

  return (
    <View style={{ display: 'flex', flexDirection: 'row', paddingLeft: 2 }}>
      <NavigationBackdrop />
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          marginTop: s.$6,
          width: '100%',
          paddingHorizontal: s.$1,
          alignItems: 'center',
          paddingBottom: s.$08,
          borderBottomColor: '#ddd',
          borderBottomWidth: 1,
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
            {!isHomePage && (
              <Pressable
                onPress={() => router.back()}
                style={{
                  position: 'absolute',
                  left: -15,
                  top: 6,
                  zIndex: 1,
                  paddingRight: 8,
                }}
              >
                <Ionicons name="chevron-back" size={18} color={c.grey2} />
              </Pressable>
            )}
            <Link dismissTo href="/" style={{ paddingLeft: 6 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'left' }}>Refs</Text>
            </Link>
          </View>
        </View>
        <View style={{ top: 1.5, paddingRight: 17 }}>
          <Link href={`/user/${user.did}`}>
            <Avatar source={user.image} size={30} />
          </Link>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', paddingRight: 18 }}>
          <Pressable onPress={() => savesBottomSheetRef.current?.expand()}>
            <View style={{ top: -2 }}>
              <SavesIcon width={28} height={28} />
            </View>
            <View
              style={{
                position: 'absolute',
                height: '85%',
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Animated.View
                style={{ top: -2, right: -6, zIndex: 1, transform: [{ scale: scaleAnim }] }}
              >
                {saves.length > 0 && <Badge count={saves.length} color="#7e8f78" />}
              </Animated.View>
            </View>
          </Pressable>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', paddingRight: 6 }}>
          <Pressable onPress={() => router.push('/messages')}>
            <View style={{ top: -3 }}>
              <MessageIcon width={30} />
            </View>
            <View
              style={{
                position: 'absolute',
                height: '85%',
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View style={{ bottom: 2, right: -10, zIndex: 1 }}>
                {newMessages > 0 && <Badge count={newMessages} color="#7e8f78" />}
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  )
}
