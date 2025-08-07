import type { ExpandedItem } from '@/features/types'

import { ScrollView, View, Pressable } from 'react-native'
import { Button } from '../buttons/Button'
import { ListItem } from './ListItem'
import { s } from '@/features/style'
import { YStack } from '../core/Stacks'
import { useAppStore } from '@/features/stores'

export const ListContainer = ({
  item,
  editingRights,
}: {
  item: ExpandedItem
  editingRights: boolean
}) => {
  const { setAddingToList, setCurrentRefId, referencersBottomSheetRef } = useAppStore()

  console.log('🔍 ListContainer render:', {
    itemId: item.id,
    isList: item.list,
    hasItems: item?.expand?.items_via_parent?.length > 0,
    itemsCount: item?.expand?.items_via_parent?.length,
    items: item?.expand?.items_via_parent?.map(i => i.expand?.ref?.title)
  })

  return (item?.expand?.items_via_parent ?? []).length > 0 ? (
    <ScrollView style={{ flex: 1, padding: s.$075 }}>
      <YStack gap={s.$075}>
        {item?.expand?.items_via_parent.map((itm) => (
          <ListItem
            onTitlePress={() => {
              setCurrentRefId(itm.ref || '')
              referencersBottomSheetRef.current?.expand()
            }}
            largeImage={true}
            key={itm.id}
            r={itm}
            showMeta={false}
            showLink={true}
          />
        ))}
      </YStack>

      {editingRights && (
        <Button
          onPress={() => setAddingToList(item.id)}
          variant="smallMuted"
          title={`Add to this list`}
        />
      )}
    </ScrollView>
  ) : (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={() => setAddingToList(item.id)}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        {editingRights && (
          <Button
            onPress={() => setAddingToList(item.id)}
            variant="smallMuted"
            title={`Add to this list`}
          />
        )}
      </Pressable>
    </View>
  )
}
