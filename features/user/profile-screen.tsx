import { View } from 'react-native'
import { Profile } from '@/ui'

export function UserProfileScreen({ userName }: { userName: string }) {
  if (!userName) {
    return null
  }

  return <View style={{ flex: 1 }}>{userName && <Profile userName={userName} />}</View>
}
