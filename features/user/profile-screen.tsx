import { View } from 'react-native'
import { NewUserProfile, Profile } from '@/ui'

export function UserProfileScreen({ userName }: { userName: string }) {
  console.log('LOAD PROFILE', userName)
  if (!userName) {
    return null
  }

  return (
    <View style={{ flex: 1 }}>
      {userName === 'new' && <NewUserProfile />}
      {userName !== 'new' && <Profile userName={userName} />}
    </View>
  )
}
