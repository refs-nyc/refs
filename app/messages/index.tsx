import { ConversationsScreen } from '@/features/messaging/conversations-screen'
import { useAppStore } from '@/features/stores'
import { useRouter } from 'expo-router'
import { SwipeToGoBack } from '@/ui/SwipeToGoBack'
import { useNavigation } from '@react-navigation/native'

export default function Screen() {
  const { user, cachedSearchResults, setHomePagerIndex, setProfileNavIntent, homePagerIndex, directoriesFilterTab } = useAppStore()
  const router = useRouter()
  const navigation = useNavigation<any>()

  if (!user) {
    router.dismissTo('/')
    return
  }

  // Back handler with robust fallbacks
  const handleBackPress = () => {
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

    // If we have cached search results, navigate back to profile to restore them
    if (cachedSearchResults.length > 0 && user?.userName) {
      setHomePagerIndex(0)
      setProfileNavIntent({ targetPagerIndex: 0, source: 'other' })
      router.push(`/user/${user.userName}`)
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
  }

  return (
    <SwipeToGoBack onSwipeComplete={handleBackPress}>
      <ConversationsScreen />
    </SwipeToGoBack>
  )
}
