import { Feed } from '@/features/home/feed'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { router } from 'expo-router'

export default function Screen() {
  const { user } = useUserStore()

  if (!user) {
    router.dismissAll()
  }

  return <Feed />
}
