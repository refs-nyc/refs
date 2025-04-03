import { useUserStore } from '@/features/pocketbase/stores/users'
import { UserDetailsScreen } from '@/features/user/detail-screen'
import { router, useLocalSearchParams } from 'expo-router'

export default function ModalScreen() {
  const { user } = useUserStore()

  if (!user) {
    router.dismissAll()
  }

  const { userName, initialId } = useLocalSearchParams()
  const initialIdParam = typeof initialId === 'string' ? initialId : initialId?.[0]

  return <UserDetailsScreen userName={userName as string} initialId={initialIdParam} />
}
