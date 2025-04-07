import { useUserStore } from '@/features/pocketbase'
import { UserDetailsScreen } from '@/features/user/detail-screen'
import { useLocalSearchParams, useRouter } from 'expo-router'

export default function ModalScreen() {
  /**
   * This screen displays the current user's refs in a modal.
   */
  const { user } = useUserStore()
  const { initialId } = useLocalSearchParams()

  // Only show the modal if the user is logged in
  const router = useRouter()

  if (!user) {
    router.dismissTo('/')
    return
  }

  const initialIdParam = typeof initialId === 'string' ? initialId : initialId?.[0]

  return <UserDetailsScreen userName={user.userName} initialId={initialIdParam} />
}
