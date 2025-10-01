import { useAppStore } from '@/features/stores'
import { UserProfileScreen } from '@/features/user/profile-screen'
import { useGlobalSearchParams, useRouter } from 'expo-router'
import { useEffect } from 'react'

export default function Screen() {
  const { user } = useAppStore()

  const { userName, userId } = useGlobalSearchParams()
  const router = useRouter()

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

  return <UserProfileScreen userName={userNameParam} prefetchedUserId={userIdParam} />
}
