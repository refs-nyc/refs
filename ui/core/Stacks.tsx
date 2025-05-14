import { View, Dimensions, StyleProp, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const dims = Dimensions.get('window')
let vh = dims.height

export const YStack = ({
  children,
  gap,
  style,
  screenHeight,
  ...props
}: {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  gap?: string | number
  screenHeight?: boolean
}) => {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[style, { flexDirection: 'column', gap }, screenHeight && { height: vh - insets.top }]}
      {...props}
    >
      {children}
    </View>
  )
}

export const XStack = ({
  children,
  gap,
  style,
  ...props
}: {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  gap?: string | number
}) => (
  <View style={[style, { flexDirection: 'row', gap }]} {...props}>
    {children}
  </View>
)
