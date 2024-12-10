import { View as NativeView, Text } from 'react-native'

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

export const View = ({ children, style }) => <NativeView style={style}>{children}</NativeView>
export const YStack = ({ children, gap, style }) => (
  <NativeView style={style} gap={gap} flexDirection="column">
    {children}
  </NativeView>
)
// export const YStack = () => <Text>Missing YStack</Text>
export const XStack = ({ children, gap, style }) => (
  <NativeView style={style} gap={gap} flexDirection="row">
    {children}
  </NativeView>
)
export const H2 = ({ children }) => <Text>{children}</Text>
export const Spinner = () => <Text>Loading</Text>
export const SizableText = ({ children }) => <Text>{children}</Text>
export const Paragraph = ({ children }) => <Text>{children}</Text>
