import { MessagesScreen } from '@/features/messaging/messages-screen';
import { useUserStore } from '@/features/pocketbase/stores/users'
import { useLocalSearchParams, useRouter } from 'expo-router'

export default function Page() 
{
  const { user } = useUserStore()
  const router = useRouter()
  
  if (!user) {
    router.dismissTo('/');
    return;
  }

  const { conversationId } = useLocalSearchParams();
  if (typeof conversationId !== 'string') return null;

  return <MessagesScreen conversationId={conversationId} />
}