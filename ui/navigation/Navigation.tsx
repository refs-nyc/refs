import { router, usePathname } from 'expo-router'
import { Text, View, Pressable, Animated } from 'react-native'
import { c, s } from '@/features/style'
import { useAppStore } from '@/features/stores'
import { NavigationBackdrop } from '@/ui/navigation/NavigationBackdrop'
import { Badge } from '../atoms/Badge'
import { useMemo, useRef, useEffect } from 'react'
import Svg, { Path } from 'react-native-svg'
import MessageIcon from '@/assets/icons/message.svg'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet from '@gorhom/bottom-sheet'
import { useNavigation } from '@react-navigation/native'

export const Navigation = ({
  savesBottomSheetRef,
}: {
  savesBottomSheetRef: React.RefObject<BottomSheet>
}) => {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const inMessageThread =
    segments[0] === 'messages' &&
    segments.length >= 2 &&
    segments[1] !== 'archive' &&
    segments[1] !== 'new-gc'

  const {
    user,
    saves,
    cachedSearchResults,
    logoutSheetRef,
    homePagerIndex,
    directoriesFilterTab,
    setProfileNavIntent,
    setHomePagerIndex,
    conversationUnreadCounts,
  } = useAppStore()

  const isHomePage = pathname === '/' || pathname === '/index' || pathname === `/user/${user?.userName}`

  const scaleAnim = useRef(new Animated.Value(1)).current
  const navigation = useNavigation<any>()

  // Back button handler with robust fallbacks for directories and no-stack cases
  const handleBackPress = () => {
    const routerCanGoBack = typeof (router as any).canGoBack === 'function' ? (router as any).canGoBack() : false
    const navCanGoBack = navigation?.canGoBack?.() ?? false

    // If we have cached search results, navigate back to profile to restore them
    if (cachedSearchResults.length > 0 && user?.userName) {
      setHomePagerIndex(0)
      setProfileNavIntent({ targetPagerIndex: 0, source: 'other' })
      router.push(`/user/${user.userName}`)
      return
    }

    if (routerCanGoBack || navCanGoBack) {
      if (routerCanGoBack) {
        router.back()
      } else {
        navigation.goBack()
      }
      return
    }

    if (user?.userName) {
      const fallbackIndex = homePagerIndex ?? 0
      setHomePagerIndex(fallbackIndex)
      setProfileNavIntent({
        targetPagerIndex: fallbackIndex as 0 | 1 | 2,
        directoryFilter: fallbackIndex === 1 ? directoriesFilterTab : undefined,
        source: 'back-fallback',
      })
      router.replace(`/user/${user.userName}`)
      return
    }
  }

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

  const newMessages = useMemo(() => {
    if (!user?.id) return 0
    return Object.values(conversationUnreadCounts).reduce((total, count) => total + count, 0)
  }, [conversationUnreadCounts, user?.id])

  if (!user) return null
  if (inMessageThread) return null

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
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
            {!isHomePage && (
              <Pressable
                onPress={handleBackPress}
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
            <Pressable
            onPress={() => {
              if (!user?.userName) return
              const targetIndex = homePagerIndex ?? 0
              setHomePagerIndex(targetIndex)
              setProfileNavIntent({
                targetPagerIndex: targetIndex as 0 | 1 | 2,
                directoryFilter: targetIndex === 1 ? directoriesFilterTab : undefined,
                source: 'other',
              })
                router.push(`/user/${user.userName}`)
              }}
              onLongPress={() => {
                logoutSheetRef?.current?.expand?.()
              }}
              style={{ paddingLeft: 6 }}
            >
              <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'left' }}>Refs</Text>
            </Pressable>
          </View>
        </View>
        {/* Avatar temporarily removed */}
        <View style={{ display: 'flex', flexDirection: 'row', paddingRight: 18 }}>
          <Pressable onPress={() => savesBottomSheetRef.current?.expand()}>
            <View style={{ top: -2 }}>
              <Svg width={42} height={31} viewBox="0 0 34 31" fill="none">
                <Path d="M24.5059 2C19.449 2 16.9564 6.9852 16.9564 6.9852C16.9564 6.9852 14.4638 2 9.40693 2C5.29726 2 2.04286 5.43823 2.0008 9.54089C1.91511 18.057 8.75652 24.1133 16.2554 29.2028C16.4621 29.3435 16.7064 29.4187 16.9564 29.4187C17.2064 29.4187 17.4507 29.3435 17.6574 29.2028C25.1555 24.1133 31.9969 18.057 31.912 9.54089C31.8699 5.43823 28.6155 2 24.5059 2Z" stroke="#B0B0B0" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
              </Svg>
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
                style={{ bottom: 16, right: -16, zIndex: 1, transform: [{ scale: scaleAnim }] }}
              >
                {saves.length > 0 && <Badge count={saves.length} color="#7e8f78" />}
              </Animated.View>
            </View>
          </Pressable>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', paddingRight: 6 }}>
          <Pressable
            onPress={() => {
              if (pathname.startsWith('/messages')) return
              const targetIndex = homePagerIndex ?? 0
              setHomePagerIndex(targetIndex)
              setProfileNavIntent({
                targetPagerIndex: targetIndex as 0 | 1 | 2,
                directoryFilter: targetIndex === 1 ? directoriesFilterTab : undefined,
                source: 'messages',
              })
              router.navigate('/messages')
            }}
          >
            <View style={{ top: -3, position: 'relative' }}>
              <MessageIcon width={36} />
              {newMessages > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    height: '85%',
                    width: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ position: 'absolute', bottom: 16, right: -16, zIndex: 1 }}>
                    <Badge count={newMessages} color="#7e8f78" />
                  </View>
                </View>
              )}
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  )
}
