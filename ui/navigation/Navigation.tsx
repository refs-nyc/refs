import Ionicons from '@expo/vector-icons/Ionicons'
import { useEffect } from 'react'
import { Link, usePathname } from 'expo-router'
import { View } from 'react-native'
import { XStack } from '../core/Stacks'
import { Avatar } from '../atoms/Avatar'
import { c, s } from '@/features/style'
import { pocketbase } from '@/features/pocketbase'
import { useUserStore } from '@/features/pocketbase/stores/users'

export const Navigation = () => {
  const { user } = useUserStore()

  const pathName = usePathname()

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
    pathName.includes('/details') // /user/[username]/details
  )
    return <></>

  return (
    <XStack
      gap={s.$075}
      style={{
        position: 'absolute',
        bottom: s.$4,
        left: '50%',
        transform: 'translate(-50%, 0)',
        zIndex: 1,
        backgroundColor: c.surface,
        paddingVertical: s.$05,
        paddingHorizontal: s.$075,
        borderColor: c.black,
        borderWidth: 2,
        borderRadius: s.$3,
      }}
    >
      {pocketbase.authStore.record ? (
        <Link href={`/user/${pocketbase.authStore.record.userName}`}>
          <Avatar source={pocketbase.authStore.record.image} size={s.$3} />
        </Link>
      ) : (
        <View style={{ width: s.$3, height: s.$3 }}>
          <Ionicons name="person" size={s.$3} color={c.accent} />
        </View>
      )}
      <Link href="/">
        <Ionicons name="globe" size={s.$3} color={c.accent} />
      </Link>
      <Link href="/">
        <Ionicons name="paper-plane" size={s.$3} />
      </Link>
    </XStack>
  )
}
