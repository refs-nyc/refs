import { router, usePathname } from 'expo-router'
import { Text, View, Pressable, StyleSheet } from 'react-native'
import { c, s } from '@/features/style'
import { useAppStore } from '@/features/stores'
import { Badge } from '../atoms/Badge'
import { useMemo } from 'react'
import MessageIcon from '@/assets/icons/message.svg'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet from '@gorhom/bottom-sheet'
import { useNavigation } from '@react-navigation/native'
import { withInteraction } from '@/features/perf/interactions'

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
    logoutSheetRef,
    homePagerIndex,
    directoriesFilterTab,
    setProfileNavIntent,
    setHomePagerIndex,
    conversationUnreadCounts,
  } = useAppStore()

  const isHomePage = pathname === '/' || pathname === '/index' || pathname === `/user/${user?.userName}`

  const navigation = useNavigation<any>()

  // Back button handler with robust fallbacks for directories and no-stack cases
  const handleBackPress = () => {
    const routerCanGoBack = typeof (router as any).canGoBack === 'function' ? (router as any).canGoBack() : false
    const navCanGoBack = navigation?.canGoBack?.() ?? false

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

  const newMessages = useMemo(() => {
    if (!user?.id) return 0
    return Object.values(conversationUnreadCounts).reduce((total, count) => total + count, 0)
  }, [conversationUnreadCounts, user?.id])

  const onBackPress = useMemo(
    () => withInteraction('navigation:back-button', handleBackPress),
    [handleBackPress]
  )

  if (!user || inMessageThread) return null

  return (
    <View style={{ display: 'flex', flexDirection: 'row', paddingLeft: 2, backgroundColor: c.surface }}>
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
                onPress={onBackPress}
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
              style={{ paddingLeft: 3 }}
            >
              <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'left' }}>Refs</Text>
            </Pressable>
          </View>
        </View>
        {/* Avatar temporarily removed */}
        <View style={{ display: 'flex', flexDirection: 'row', paddingRight: 18 }}>
          <Pressable onPress={() => savesBottomSheetRef.current?.expand()}>
            <View style={{ top: -2 }}>
              <Ionicons name="earth-outline" size={34} color={c.newDark} />
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
                <View style={{ position: 'absolute', top: 0, right: 0, zIndex: 1 }}>
                  <Badge count={newMessages} color="#7e8f78" />
                </View>
              )}
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  )
}
