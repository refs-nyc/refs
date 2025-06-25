import { View } from 'react-native'
import { Heading } from '../typo/Heading'
import { c, s } from '@/features/style'
import { ExpandedItem } from '@/features/pocketbase/stores/types'

export const AddedNewRefConfirmation = ({ itemData }: { itemData: ExpandedItem }) => {
  return (
    <View style={{ padding: s.$3 }}>
      <Heading tag="h1" style={{ color: c.white }}>
        {itemData.expand.ref.title} was added to {itemData.backlog ? 'backlog' : 'grid'}
      </Heading>
    </View>
  )
}
