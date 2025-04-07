import { useUserStore } from '@/features/pocketbase/stores/users'
import { UserProfileScreen } from '@/features/user/profile-screen'
import { useGlobalSearchParams, useRouter } from 'expo-router'

export default function Screen() {
  const { user } = useUserStore()

  const { userName } = useGlobalSearchParams()

  // Only show the modal if the user is logged in
  const router = useRouter()

  if (!user) {
    router.dismissTo('/')
    return
  }

  const userNameParam = typeof userName === 'string' ? userName : userName?.[0]

  return <UserProfileScreen userName={userNameParam} />
}
