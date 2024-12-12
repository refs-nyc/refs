import { View } from 'react-native'
import { NewProfile, Profile } from '@/ui'

export function UserDetailScreen({ id }: { id: string }) {
  if (!id) {
    return null
  }

  return (
    <View style={{ flex: 1 }}>
      {id === 'new' && <NewProfile />}
      {/* TBD */}
      {id !== 'new' && <Profile userName={id} />}
    </View>
  )
}
