import { useAppStore } from '@/features/stores'
import { UserProfileScreen } from '@/features/user/profile-screen'
import { useGlobalSearchParams, useRouter } from 'expo-router'
import { useEffect } from 'react'

export default function Screen() {
  const { user } = useAppStore()

  const { userName } = useGlobalSearchParams()

  // Only show the modal if the user is logged in
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

  return <UserProfileScreen userName={userNameParam} />
}
