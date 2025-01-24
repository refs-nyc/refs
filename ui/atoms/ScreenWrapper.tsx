import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ScrollView } from 'react-native-gesture-handler'

export const ScreenWrapper = ({ children }) => {
  const insets = useSafeAreaInsets()

  return <ScrollView style={{ paddingTop: Math.max(insets.top, 16) }}>{children}</ScrollView>
}
