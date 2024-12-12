import { SizableText } from '@/ui'
import { GridTile } from './GridTile'
import { View } from 'react-native'
import { s } from '@/features/style'

export const GridTileList = ({ title }: { title: string }) => (
  <GridTile borderColor="black">
    <View style={{ flex: 1, padding: s.$025 }}>
      <SizableText style={{ fontSize: 12, lineHeight: 14 }} ta="left" m="$2">
        {title}
      </SizableText>
    </View>
  </GridTile>
)
