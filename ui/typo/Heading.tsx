import { Text } from 'react-native'
import { typo } from '@/features/style/index'

// Add this type definition
type TypoTag = keyof typeof typo

export const Heading = ({
  children,
  style,
  tag,
  ...props
}: {
  children?: React.ReactNode
  style?: any
  tag: TypoTag
  numberOfLines?: number
}) => {
  let typeStyle = null

  if (tag in typo) typeStyle = typo[tag]

  return (
    <Text style={[typeStyle, style]} {...props}>
      {children}
    </Text>
  )
}
