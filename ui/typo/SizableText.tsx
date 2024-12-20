import { Text } from 'react-native'
import { typo } from '../../features/style/index'

type TypoTag = keyof typeof typo

export const SizableText = ({
  children,
  style,
  tag,
}: {
  children: React.ReactNode
  style?: any
  tag?: TypoTag
}) => {
  let typeStyle = null

  if (tag && tag in typo) typeStyle = typo[tag]

  return <Text style={[style, typeStyle]}>{children}</Text>
}
