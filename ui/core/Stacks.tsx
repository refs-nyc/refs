import { View, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const dims = Dimensions.get('window')
let vh = dims.height

export const YStack = ({
  children,
  gap,
  style,
  screenHeight,
}: {
  children: React.ReactNode
  style?: any
  gap?: string | number
  screenHeight?: boolean
}) => {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[style, { flexDirection: 'column', gap }, screenHeight && { height: vh - insets.top }]}
    >
      {children}
    </View>
  )
}

export const XStack = ({
  children,
  gap,
  style,
}: {
  children: React.ReactNode
  style?: any
  gap?: string | number
}) => <View style={[style, { flexDirection: 'row', gap }]}>{children}</View>
