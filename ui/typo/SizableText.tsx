import { Text } from 'react-native'
import { typo } from '../../features/style/index'

export const SizableText = ({
  children,
  style,
  tag,
}: {
  children: React.ReactNode
  style?: any
  tag?: string
}) => {
  let typeStyle = null

  if (tag in typo) typeStyle = typo[tag]

  return <Text style={[style, typeStyle]}>{children}</Text>
}
