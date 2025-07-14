import { useAppStore } from '@/features/pocketbase'
import { SettingsScreen } from '@/features/settings/screen'
import { useRouter } from 'expo-router'

export default function Screen() {
  const { user } = useAppStore()
  const router = useRouter()

  if (!user) {
    router.dismissTo('/')
    return
  }

  return <SettingsScreen />
}
