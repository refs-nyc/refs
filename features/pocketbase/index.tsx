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
  return await itemStore.addToProfile(existingRefId, stagedItemFields, backlog)
}

export { pocketbase, useItemStore, useUserStore, addToProfile }
