import { View } from 'react-native'
import { NewUserProfile, Profile } from '@/ui'

export function UserDetailScreen({ id }: { id: string }) {
  if (!id) {
    return null
  }

  return (
    <View style={{ flex: 1 }}>
      {id === 'new' && <NewUserProfile />}
      {/* {id === 'new' && <NewProfile />} */}
      {/* TBD */}
      {id !== 'new' && <Profile userName={id} />}
    </View>
  )
}
