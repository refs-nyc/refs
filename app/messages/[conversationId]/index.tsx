import { MessagesScreen } from '@/features/messaging/messages-screen'
import { useAppStore } from '@/features/pocketbase'
import { useLocalSearchParams, useRouter } from 'expo-router'

export default function Page() {
  const { user } = useAppStore()
  const router = useRouter()

  if (!user) {
    router.dismissTo('/')
    return
  }

  const { conversationId } = useLocalSearchParams()
  if (typeof conversationId !== 'string') return null

  return <MessagesScreen conversationId={conversationId} />
}
