import { MessagesScreen } from '@/features/messaging/messages-screen'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { useRouter } from 'expo-router'

export default function Screen() 
{
  const { user } = useUserStore()
  const router = useRouter()

  if (!user) 
  {
    router.dismissTo('/');
    return;
  }
  
  return <MessagesScreen />
}