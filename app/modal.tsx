import { useUserStore } from '@/features/pocketbase'
import { UserDetailsScreen } from '@/features/user/detail-screen'
import { Redirect, useLocalSearchParams } from 'expo-router'

export default function ModalScreen() {
  const { initialId } = useLocalSearchParams()
  const initialIdParam = typeof initialId === 'string' ? initialId : initialId?.[0]
  const { user } = useUserStore()

  if (!user) {
    return <Redirect href="/" />
  }

  return <UserDetailsScreen userName={user.userName} initialId={initialIdParam} />
}
