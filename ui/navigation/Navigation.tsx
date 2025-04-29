import Animated, { SlideInDown, FadeOut } from 'react-native-reanimated'
import { Link, usePathname, useGlobalSearchParams } from 'expo-router'
import { Dimensions, View, Text } from 'react-native'
import { Avatar } from '../atoms/Avatar'
import { c, s } from '@/features/style'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { Icon } from '@/assets/icomoon/IconFont'
import { Ionicons } from '@expo/vector-icons'
import { useMessageStore } from '@/features/pocketbase/stores/messages'
import { Badge } from '../atoms/Badge'
import { useMemo } from 'react'

const win = Dimensions.get('window')

export const Navigation = () => {
  const { user } = useUserStore()

  const pathName = usePathname()
  const { addingTo, removingId } = useGlobalSearchParams()

  const {saves, messages, conversations, memberships} = useMessageStore();

  const countNewMessages = () => 
  {
    if (!user) return 0;
    let newMessages = 0;
    for (const conversationId in conversations) {
      const lastRead = memberships[conversationId].find(m => m.expand?.user.id === user?.id)?.last_read;
      const lastReadDate = new Date(lastRead || '');
      const conversationMessages = messages.filter(m => m.conversation === conversationId);
      let unreadMessages;
      if (lastReadDate) unreadMessages = conversationMessages.filter(m => new Date(m.created!) > lastReadDate).length;
      else unreadMessages = conversationMessages.length;
      newMessages += unreadMessages;
    }
    return newMessages;
  }
  const newMessages = useMemo(() => countNewMessages(), [messages, memberships, user]);

  if (
    !user ||
    pathName.includes('/onboarding') ||
    pathName.includes('/user/login') ||
    pathName.includes('/user/register') ||
    (pathName.includes('/modal') && !pathName.includes('/saves/modal')) || // want the navbar to stay visible under the saves modal
    pathName.includes('/messages/') || // e.g. /messages/123
    addingTo === 'grid' ||
    addingTo === 'backlog' ||
    !!removingId
  ) {
    return <></>
  }

  return (
    <Animated.View
      style={{
        position: 'absolute',
        zIndex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        bottom: s.$5,
        alignSelf: 'center',
      }}
      entering={SlideInDown.duration(200)}
      exiting={FadeOut.duration(200)}
      onStartShouldSetResponder={(event) => true}
    >
      <View
        style={{
          position: 'relative',
          overflow: 'hidden',
          paddingBottom: 6,
        }}
      >
        <View
          style={{
            borderColor: c.black,
            borderWidth: 2,
            borderRadius: s.$3,
            gap: 28,
            flexDirection: 'row',
            backgroundColor: c.surface,
            paddingVertical: 8,
            paddingHorizontal: 16,
            zIndex: 1,
          }}
        >
          <View style={{ position: 'relative', marginTop: 4, left: 5 }}>
            <Link dismissTo href={`/`}>
              <Avatar source={user.image} size={42} />
            </Link>
          </View>
          <View style={{ position: 'relative', left: -2, marginTop: 3, paddingRight: 3 }}>
            <Link dismissTo href="/feed">
              {/* <Ionicons name="globe" size={42} color={c.accent} /> */}
              <Icon name="Globe" size={39} color={c.accent} />
            </Link>
          </View>
          <View 
            style={{ position: 'relative', left: -10, marginTop: 3, paddingRight: 3 }}
          >
            <Link dismissTo href="/messages" >
              <Icon name="Messages" size={39} color={c.muted2} />
            </Link>
            {newMessages > 0 && <Badge count={newMessages} color={c.red}/>}
          </View>
          <View 
            style={{ position: 'relative', left: -20, marginTop: 3, paddingRight: 3 }}
          >
            <Link push href="/saves/modal">
              <Ionicons name="paper-plane" size={39} color={c.muted2} />
            </Link>
            {saves.length > 0 && <Badge count={saves.length} />}
          </View>
        </View>
        <View
          style={[
            {
              // paddingHorizontal: s.$2,
              // width: '100%',
              height: '100%',
              backgroundColor: c.black,
              position: 'absolute',
              zIndex: 0,
              left: 0,
              right: 0,
              top: 6,
              borderRadius: s.$3,
              transformOrigin: 'bottom',
              transform: 'scaleY(1.05)',
            },
          ]}
        />
      </View>
    </Animated.View>
  )
}
