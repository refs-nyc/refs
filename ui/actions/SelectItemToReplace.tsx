import { RefsRecord } from '@/features/pocketbase/stores/pocketbase-types'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { Button } from '@/ui/buttons/Button'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { AddRefSheetGrid } from '@/ui/profiles/sheets/AddRefSheetGrid'
import { Text, View } from 'react-native'

export const SelectItemToReplace = ({
  gridItems,
  refData,
  onSelectItemToReplace,
  onAddToBacklog,
}: {
  gridItems: ExpandedItem[]
  refData: RefsRecord
  onSelectItemToReplace: (item: ExpandedItem) => void
  onAddToBacklog: () => Promise<void>
}) => {
  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: s.$3,
        gap: s.$1,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: c.surface, fontSize: s.$1 }}>
        Adding {refData.title} to your profile
      </Text>
      {refData?.image && (
        <View style={{ alignItems: 'center' }}>
          <SimplePinataImage
            originalSource={refData?.image}
            style={{ height: 80, width: 80 }}
            imageOptions={{
              width: 80,
              height: 80,
            }}
          />
        </View>
      )}
      <Text style={{ color: c.surface, fontSize: s.$1 }}>Choose a grid item to replace</Text>
      <AddRefSheetGrid gridItems={gridItems} onSelectItem={onSelectItemToReplace} />
      <Button title="Add to backlog instead" variant="small" onPress={onAddToBacklog} />
    </View>
  )
}
