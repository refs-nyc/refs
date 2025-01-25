import { View } from 'react-native'
import { useNavigation } from '@react-navigation/native';
import { NewUserProfile, Profile, SwipeToGoBack } from '@/ui'

export function UserProfileScreen({ userName }: { userName: string }) {
  if (!userName) {
    return null
  }

  const navigation = useNavigation();

  const handleSwipeComplete = () => {
    navigation.goBack()
  };

  return (
    <SwipeToGoBack onSwipeComplete={handleSwipeComplete}>
      <View style={{ flex: 1 }}>
        {userName === 'new' && <NewUserProfile />}
        {userName !== 'new' && <Profile userName={userName} />}
      </View>
    </SwipeToGoBack>
  )
}
