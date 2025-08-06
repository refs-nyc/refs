import { useAppStore } from '@/features/stores'
import { UserProfileScreen } from '@/features/user/profile-screen'
import { useGlobalSearchParams, useRouter } from 'expo-router'

export default function Screen() {
  const { user } = useAppStore()

  const { did } = useGlobalSearchParams()

  // Only show the modal if the user is logged in
  const router = useRouter()

  if (!user) {
    router.dismissTo('/')
    return
  }

  const didParam = typeof did === 'string' ? did : did?.[0]

  return <UserProfileScreen did={didParam} />
}
