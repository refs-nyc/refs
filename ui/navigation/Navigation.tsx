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

export const Navigation = () => {
  const { user } = useUserStore()

  const pathName = usePathname()
  const { addingTo } = useGlobalSearchParams()

  useEffect(() => {
    console.log('user')
    console.log(user)
    console.log(user)
  }, [user])

  if (
    (pathName === '/' && !pocketbase.authStore.isValid) ||
    pathName.includes('/onboarding') ||
    pathName.includes('/user/login') ||
    pathName.includes('/user/new') ||
    pathName.includes('/details') ||
    addingTo === 'grid' ||
    addingTo === 'backlog'
  ) {
    return <></>
  }

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: s.$4,
        left: '50%',
        transform: 'translate(-50%, 0)',
        zIndex: 1,
        backgroundColor: c.surface,
        paddingVertical: s.$075,
        paddingHorizontal: s.$1,
        borderColor: c.black,
        borderWidth: 2,
        borderRadius: s.$3,
        gap: s.$1,
        flexDirection: 'row',
      }}
      entering={SlideInDown.duration(200)}
      exiting={SlideOutDown.duration(200)}
    >
      {pocketbase.authStore.record ? (
        <View style={{ position: 'relative', marginTop: 4, marginLeft: 4 }}>
          <Link href={`/user/${pocketbase.authStore.record.userName}`}>
            <Avatar source={pocketbase.authStore.record.image} size={33} />
          </Link>
        </View>
      ) : (
        <View style={{ width: 36, height: 36 }}>
          <Ionicons name="person" size={s.$3} color={c.accent} />
        </View>
      )}
      <Link href="/">
        <Ionicons name="globe" size={36} color={c.accent} />
      </Link>
      <View style={{ position: 'relative', marginLeft: -2, marginTop: 2, paddingRight: 3 }}>
        <Link href="/">
          <Ionicons name="paper-plane" size={33} />
        </Link>
      </View>
    </Animated.View>
  )
}
