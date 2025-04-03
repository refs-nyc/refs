import { useUserStore } from '@/features/pocketbase/stores/users'
import { UserProfileScreen } from '@/features/user/profile-screen'
import { router, useGlobalSearchParams } from 'expo-router'

export default function Screen() {
  const { user } = useUserStore()

  if (!user) {
    router.dismissAll()
  }

  const { userName } = useGlobalSearchParams()
  const userNameParam = typeof userName === 'string' ? userName : userName?.[0]

  return <UserProfileScreen userName={userNameParam} />
}
