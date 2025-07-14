import { ConversationsScreen } from '@/features/messaging/conversations-screen'
import { useAppStore } from '@/features/pocketbase'
import { useRouter } from 'expo-router'

export default function Screen() {
  const { user } = useAppStore()
  const router = useRouter()

  if (!user) {
    router.dismissTo('/')
    return
  }

  return <ConversationsScreen />
}
