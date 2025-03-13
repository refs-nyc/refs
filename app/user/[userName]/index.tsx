import { UserProfileScreen } from '@/features/user/profile-screen'
import { useGlobalSearchParams } from 'expo-router'
import { Text } from 'react-native'

export default function Screen() {
  const { userName } = useGlobalSearchParams()
  const userNameParam = typeof userName === 'string' ? userName : userName?.[0]

  return <UserProfileScreen userName={userNameParam} />
}
