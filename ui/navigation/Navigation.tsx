import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated'

import Ionicons from '@expo/vector-icons/Ionicons'
import { useEffect } from 'react'
import { Link, usePathname, useGlobalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { XStack } from '../core/Stacks'
import { Avatar } from '../atoms/Avatar'
import { c, s } from '@/features/style'
import { pocketbase } from '@/features/pocketbase'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { Icon } from '@/assets/icomoon/IconFont'

export const Navigation = () => {
  const { user } = useUserStore()

  const pathName = usePathname()
  const { addingTo, removingId } = useGlobalSearchParams()

  useEffect(() => {
    console.log('user:', user)
  }, [user])

  if (
    (pathName === '/' && !pocketbase.authStore.isValid) ||
    pathName.includes('/onboarding') ||
    pathName.includes('/user/login') ||
    pathName.includes('/user/new') ||
    pathName.includes('/details') ||
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
        right: 0,
        left: 0,
      }}
      entering={SlideInDown.duration(200)}
      exiting={SlideOutDown.duration(200)}
    >
      <View
        style={{
          borderColor: '#555',
          borderWidth: 1.5,
          borderRadius: s.$3,
          gap: s.$1,
          flexDirection: 'row',
          backgroundColor: c.surface,
          paddingVertical: 8,
          paddingHorizontal: 10,
        }}
      >
        {pocketbase.authStore.record ? (
          <View style={{ position: 'relative', marginTop: 4, left: 5 }}>
            <Link href={`/user/${pocketbase.authStore.record.userName}`}>
              <Avatar source={pocketbase.authStore.record.image} size={36} />
            </Link>
          </View>
        ) : (
          <View style={{ width: 36, height: 36 }}>
            <Ionicons name="person" size={s.$3} color={c.accent} />
          </View>
        )}
        <View style={{ position: 'relative', left: -2, marginTop: 3, paddingRight: 3 }}>
          <Link href="/">
            {/* <Ionicons name="globe" size={36} color={c.accent} /> */}
            <Icon name="Globe" size={33} color={c.accent} />
          </Link>
        </View>
        {/* <View style={{ position: 'relative', marginLeft: -2, marginTop: 2, paddingRight: 3 }}>
          <Link href="/">
            <Ionicons name="paper-plane" size={33} />
          </Link>
        </View> */}
      </View>
    </Animated.View>
  )
}
