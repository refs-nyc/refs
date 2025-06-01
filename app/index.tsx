import { HomeScreen } from '@/features/home/screen'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { LoadingScreen } from '@/ui/display/LoadingScreen'

export default function Screen() {
  const { isInitialized } = useUserStore()

  if (!isInitialized) {
    return <LoadingScreen />
  }

  return <HomeScreen />
}
