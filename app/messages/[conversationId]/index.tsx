import { MessagesScreen } from '@/features/messaging/messages-screen'
import { useAppStore } from '@/features/stores'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SwipeToGoBack } from '@/ui/SwipeToGoBack'
import { useNavigation } from '@react-navigation/native'
import { useRef, useCallback } from 'react'

export default function Page() {
  const { user, setHomePagerIndex, setProfileNavIntent, homePagerIndex, directoriesFilterTab } = useAppStore()
  const router = useRouter()
  const navigation = useNavigation<any>()
  const { conversationId } = useLocalSearchParams()
  
  const closeHandlerRef = useRef<(() => void) | null>(null)

  const performNavigation = useCallback(() => {
    const routerCanGoBack = typeof (router as any).canGoBack === 'function' ? (router as any).canGoBack() : false
    const navCanGoBack = navigation?.canGoBack?.() ?? false

    // Always try router.back() or navigation.goBack() first for proper animation direction
    if (routerCanGoBack || navCanGoBack) {
      if (routerCanGoBack) {
        router.back()
      } else {
        navigation.goBack()
      }
      return
    }

    // Last resort fallback
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
  }, [directoriesFilterTab, homePagerIndex, navigation, router, setHomePagerIndex, setProfileNavIntent, user?.userName])

  const requestClose = useCallback(() => {
    if (closeHandlerRef.current) {
      closeHandlerRef.current()
    } else {
      performNavigation()
    }
  }, [performNavigation])

  // Conditional checks AFTER all hooks to comply with rules of hooks
  if (!user) {
    router.dismissTo('/')
    return null
  }

  if (typeof conversationId !== 'string') return null

  return (
    <SwipeToGoBack onSwipeComplete={requestClose} interactionLabel="messages:swipe-back">
      <MessagesScreen
        conversationId={conversationId}
        onClose={performNavigation}
        registerCloseHandler={(fn) => {
          closeHandlerRef.current = fn ?? null
        }}
      />
    </SwipeToGoBack>
  )
}
