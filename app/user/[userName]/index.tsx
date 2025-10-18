import { useAppStore } from '@/features/stores'
import { UserProfileScreen } from '@/features/user/profile-screen'
import { useGlobalSearchParams, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { SwipeToGoBack } from '@/ui/SwipeToGoBack'
import { useNavigation } from '@react-navigation/native'

export default function Screen() {
  const { user, setHomePagerIndex, setProfileNavIntent, homePagerIndex, directoriesFilterTab } = useAppStore()

  const { userName, userId, isOwnProfile: isOwnProfileParam } = useGlobalSearchParams()
  const router = useRouter()
  const navigation = useNavigation<any>()

  useEffect(() => {
    if (!user) {
      router.dismissTo('/')
    }
  }, [user, router])

  if (!user) {
    return null
  }

  const userNameParam = typeof userName === 'string' ? userName : userName?.[0]
  const userIdParam = typeof userId === 'string' ? userId : userId?.[0]
  
  const isOwnProfile = user?.userName === userNameParam

  // Back handler with robust fallbacks (same logic as Navigation component)
  const handleBackPress = () => {
    console.log('🔙 SwipeToGoBack: handleBackPress called')
    const routerCanGoBack = typeof (router as any).canGoBack === 'function' ? (router as any).canGoBack() : false
    const navCanGoBack = navigation?.canGoBack?.() ?? false
    console.log('🔙 routerCanGoBack:', routerCanGoBack, 'navCanGoBack:', navCanGoBack)

    // Always try router.back() or navigation.goBack() first for proper animation direction
    if (routerCanGoBack || navCanGoBack) {
      console.log('🔙 Using router.back() or navigation.goBack()')
      if (routerCanGoBack) {
        router.back()
      } else {
        navigation.goBack()
      }
      return
    }

    // Last resort fallback
    if (user?.userName) {
      console.log('🔙 Using last resort fallback to own profile')
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

  // Only enable swipe-to-go-back for other profiles
  if (isOwnProfile) {
    return <UserProfileScreen userName={userNameParam} prefetchedUserId={userIdParam} />
  }

  return (
    <SwipeToGoBack onSwipeComplete={handleBackPress} interactionLabel="profile:swipe-back">
      <UserProfileScreen userName={userNameParam} prefetchedUserId={userIdParam} />
    </SwipeToGoBack>
  )
}
