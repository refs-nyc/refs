import { useUserStore } from '@/features/pocketbase'
import { UserDetailsScreen } from '@/features/user/detail-screen'
import { Redirect, router, useLocalSearchParams } from 'expo-router'

export default function ModalScreen() {
  /**
   * This screen displays the current user's refs in a modal.
   */
  const { user } = useUserStore()

  // Only show the modal if the user is logged in
  if (!user) {
    router.dismissAll()
  }

  const { initialId } = useLocalSearchParams()
  const initialIdParam = typeof initialId === 'string' ? initialId : initialId?.[0]

  if (!user) {
    return <Redirect href="/" />
  }

  return <UserDetailsScreen userName={user.userName} initialId={initialIdParam} />
}
