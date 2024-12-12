import { View as NativeView, Text } from 'react-native'
import { typo } from '@/features/style/index'

export * from './OnboardingCarouselItem'
export * from './grid/ExampleGrid'
export * from './grid/Grid'
export * from './grid/GridTile'
export * from './grid/GridTileActionAdd'
export * from './grid/GridTileImage'
export * from './grid/GridTileList'
export * from './buttons/Button'
export * from './drawers/Drawer'
export * from './actions/AddRef'
export * from './inputs/Camera'
export * from './inputs/Picker'
export * from './profiles/New'
export * from './profiles/Profile'

export const YStack = ({
  children,
  gap,
  style,
}: {
  children: React.ReactNode
  style?: any
  gap?: string | number
}) => (
  <NativeView style={[style, { gap }]} flexDirection="column">
    {children}
  </NativeView>
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
  <NativeView style={[style, { gap }]} flexDirection="row">
    {children}
  </NativeView>
)
export const Heading = ({
  children,
  style,
  tag,
}: {
  children: React.ReactNode
  style?: any
  tag: string
}) => {
  let typeStyle = null

  console.log(tag, typo)
  if (tag in typo) typeStyle = typo[tag]

  return <Text style={[style, typeStyle]}>{children}</Text>
}

export const Spinner = () => <Text>Loading</Text>
export const SizableText = ({ children }) => <Text>{children}</Text>
export const Paragraph = ({ children }) => <Text>{children}</Text>
