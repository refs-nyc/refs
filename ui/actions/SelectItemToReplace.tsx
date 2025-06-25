import { ExpandedItem, StagedItemFields } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { Button } from '@/ui/buttons/Button'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { AddRefSheetGrid } from '@/ui/profiles/sheets/AddRefSheetGrid'
import { Text, View } from 'react-native'
import { useEffect, useState } from 'react'
import { getProfileItems } from '@/features/pocketbase/stores/items'
import { useUserStore } from '@/features/pocketbase/stores/users'

export const SelectItemToReplace = ({
  stagedItemFields,
  onSelectItemToReplace,
  onAddToBacklog,
}: {
  stagedItemFields: StagedItemFields
  onSelectItemToReplace: (item: ExpandedItem) => void
  onAddToBacklog: () => Promise<void>
}) => {
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const user = useUserStore((state) => state.user)

  useEffect(() => {
    const fetchGridItems = async () => {
      if (!user) return
      const gridItems = await getProfileItems(user.userName)
      setGridItems(gridItems)
    }
    fetchGridItems()
  }, [])

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
        Adding {stagedItemFields.title} to your profile
      </Text>
      {stagedItemFields.image && (
        <View style={{ alignItems: 'center' }}>
          <SimplePinataImage
            originalSource={stagedItemFields.image}
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
