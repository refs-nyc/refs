import { useUserStore } from '@/features/pocketbase'
import { SettingsScreen } from '@/features/settings/screen'
import { useRouter } from 'expo-router'

export default function Screen() {
  const { user } = useUserStore()
  const router = useRouter()

  if (!user) {
    router.dismissTo('/')
    return
  }

  return <SettingsScreen />
}
