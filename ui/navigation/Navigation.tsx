import Animated, { SlideInDown, SlideOutDown, FadeOut } from 'react-native-reanimated'

import Ionicons from '@expo/vector-icons/Ionicons'
import { useEffect } from 'react'
import { Link, usePathname, useGlobalSearchParams } from 'expo-router'
import { Dimensions, View } from 'react-native'
import { XStack } from '../core/Stacks'
import { Avatar } from '../atoms/Avatar'
import { c, s } from '@/features/style'
import { pocketbase } from '@/features/pocketbase'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { Icon } from '@/assets/icomoon/IconFont'

const win = Dimensions.get('window')

export const Navigation = () => {
  const { user } = useUserStore()

  const pathName = usePathname()
  const { addingTo, removingId } = useGlobalSearchParams()

  if (
    (pathName === '/' && !pocketbase.authStore.isValid) ||
    pathName.includes('/onboarding') ||
    pathName.includes('/user/login') ||
    pathName.includes('/user/new') ||
    pathName.includes('/modal') ||
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
          {pocketbase.authStore.record ? (
            <View style={{ position: 'relative', marginTop: 4, left: 5 }}>
              <Link href={`/user/${pocketbase.authStore.record.userName}`}>
                <Avatar source={pocketbase.authStore.record.image} size={42} />
              </Link>
            </View>
          ) : (
            <View style={{ width: 42, height: 42 }}>
              <Ionicons name="person" size={42} color={c.accent} />
            </View>
          )}
          <View style={{ position: 'relative', left: -2, marginTop: 3, paddingRight: 3 }}>
            <Link href="/">
              {/* <Ionicons name="globe" size={42} color={c.accent} /> */}
              <Icon name="Globe" size={39} color={c.accent} />
            </Link>
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
