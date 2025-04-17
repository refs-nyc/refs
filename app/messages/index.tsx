import { ConversationsScreen } from '@/features/messaging/conversations-screen'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { useRouter } from 'expo-router'

export default function Screen() {
  const { user } = useUserStore()
  const router = useRouter()

  if (!user) {
    router.dismissTo('/');
    return;
  }

  return <ConversationsScreen />
}