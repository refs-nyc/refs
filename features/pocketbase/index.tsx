import { pocketbase } from './pocketbase'
import { useUserStore } from './stores/users'
import { useItemStore } from './stores/items'
import { ExpandedItem, StagedItemFields } from './stores/types'

const addToProfile = async (
  existingRefId: string | null,
  stagedItemFields: StagedItemFields,
  backlog: boolean
): Promise<ExpandedItem> => {
  const itemStore = useItemStore.getState()

  let newItem: ExpandedItem

  if (existingRefId) {
    // create a new item from an existing ref
    newItem = await itemStore.push(
      existingRefId,
      {
        image: stagedItemFields.image,
        url: stagedItemFields.url,
        text: stagedItemFields.text,
      },
      backlog
    )
  } else {
    // create a new item, with a new ref
    const newRef = await itemStore.pushRef({
      title: stagedItemFields.title,
      meta: stagedItemFields.meta,
      image: stagedItemFields.image,
    })
    newItem = await itemStore.push(
      newRef.id,
      {
        image: stagedItemFields.image,
        url: stagedItemFields.url,
        text: stagedItemFields.text,
      },
      backlog
    )
  }

  return newItem
}

export { pocketbase, useUserStore, useItemStore, addToProfile }
