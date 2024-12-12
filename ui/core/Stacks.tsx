import { View } from 'react-native'

export const YStack = ({
  children,
  gap,
  style,
}: {
  children: React.ReactNode
  style?: any
  gap?: string | number
}) => (
  <View style={[style, { gap }]} flexDirection="column">
    {children}
  </View>
)
// export const YStack = () => <Text>Missing YStack</Text>
export const XStack = ({
  children,
  gap,
  style,
}: {
  children: React.ReactNode
  style?: any
  gap?: string | number
}) => (
  <View style={[style, { gap }]} flexDirection="row">
    {children}
  </View>
)
