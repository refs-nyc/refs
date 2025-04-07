import { useUserStore } from '@/features/pocketbase/stores/users'
import { UserDetailsScreen } from '@/features/user/detail-screen'
import { useLocalSearchParams, useRouter } from 'expo-router'

export default function ModalScreen() {
  const { user } = useUserStore()
  const { userName, initialId } = useLocalSearchParams()

  // Only show the modal if the user is logged in
  const router = useRouter()

  if (!user) {
    router.dismissTo('/')
    return
  }

  const initialIdParam = typeof initialId === 'string' ? initialId : initialId?.[0]

  return <UserDetailsScreen userName={userName as string} initialId={initialIdParam} />
}
