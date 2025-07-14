import { HomeScreen } from '@/features/home/screen'
import { useAppStore } from '@/features/pocketbase'
import { LoadingScreen } from '@/ui/display/LoadingScreen'

export default function Screen() {
  const { isInitialized } = useAppStore()

  if (!isInitialized) {
    return <LoadingScreen />
  }

  return <HomeScreen />
}
