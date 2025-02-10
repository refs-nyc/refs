import { UserDetailsScreen } from '@/features/user/detail-screen'
import { Stack, useLocalSearchParams } from 'expo-router'

export default function ModalScreen() {
  const { userName, initialId } = useLocalSearchParams()
  const initialIdParam = typeof initialId === 'string' ? initialId : initialId?.[0]

  return <UserDetailsScreen userName={userName as string} initialId={initialIdParam} />
}
