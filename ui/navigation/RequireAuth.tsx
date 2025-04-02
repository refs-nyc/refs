import { useUserStore } from '@/features/pocketbase/stores/users'
import { router } from 'expo-router'

export const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUserStore()
  console.log('RequireAuth:', user)

  if (!user) {
    // wait a few hundred ms
    router.dismissAll()
  }

  return children
}
