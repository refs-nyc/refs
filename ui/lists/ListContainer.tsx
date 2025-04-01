import type { ExpandedItem } from '@/features/pocketbase/stores/types'
import { useItemStore } from '@/features/pocketbase/stores/items'
import { useUIStore } from '@/ui/state'
import { useState } from 'react'
import { ScrollView, View, Text, Pressable } from 'react-native'
import { Button } from '../buttons/Button'
import { ListItem } from './ListItem'
import { s } from '@/features/style'
import { YStack } from '../core/Stacks'

export const ListContainer = ({
  item,
  editingRights,
}: {
  item: ExpandedItem
  editingRights: boolean
}) => {
  const { addingToList, setAddingToList } = useUIStore()

  return (item?.expand?.children ?? []).length > 0 ? (
    <ScrollView style={{ flex: 1, padding: s.$075 }}>
      <YStack gap={s.$075}>
        {item?.expand?.children.map((itm) => (
          <ListItem key={itm.id} r={itm} showMeta={false} />
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
