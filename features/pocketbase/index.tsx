import { pocketbase } from './pocketbase'
import { useItemStore } from './stores/items'
import { ExpandedItem, StagedItemFields } from './stores/types'
import { useUserStore } from './stores/users'

const addToProfile = async (
  existingRefId: string | null,
  stagedItemFields: StagedItemFields,
  backlog: boolean
): Promise<ExpandedItem> => {
  const itemStore = useItemStore.getState()

  let newItem: ExpandedItem

  if (existingRefId) {
    // create a new item from an existing ref
    newItem = await itemStore.createItem(existingRefId, stagedItemFields, backlog)
  } else {
    // create a new item, with a new ref
    newItem = await itemStore.createItemAndRef(stagedItemFields, backlog)
  }

  return newItem
}

export { pocketbase, useItemStore, useUserStore, addToProfile }
