import { View, Text } from 'tamagui'

export const Profile = ({ profile }) => {
  return (
    <View>
      <Text>{profile.id}</Text>
    </View>
  )
}
