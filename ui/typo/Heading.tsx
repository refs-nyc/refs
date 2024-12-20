import { Text } from 'react-native'
import { typo } from '@/features/style/index'

// Add this type definition
type TypoTag = keyof typeof typo

export const Heading = ({
  children,
  style,
  tag,
}: {
  children: React.ReactNode
  style?: any
  tag: TypoTag
}) => {
  let typeStyle = null

  if (tag in typo) typeStyle = typo[tag]

  return <Text style={[style, typeStyle]}>{children}</Text>
}
