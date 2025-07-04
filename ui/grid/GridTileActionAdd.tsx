import { Text } from 'react-native'

export const GridTileActionAdd = ({ text }: { text: string }) => {
  return (
    <Text style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', textAlign: 'center', paddingHorizontal: 12 }}>{text}</Text>
  )
}
