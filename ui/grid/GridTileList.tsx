import { SizableText } from '@/ui'
import { View } from 'react-native'

export const GridTileList = ({ title }: { title: string }) => (
  <View
    style={{ flex: 1, aspectRatio: 1, justifyContent: 'start' }}
    borderColor="black"
    borderWidth="$1"
    borderRadius="$4"
  >
    <SizableText style={{ fontSize: 12, lineHeight: 14, fontWeight: 700 }} ta="left" m="$2">
      {title}
    </SizableText>
  </View>
)
