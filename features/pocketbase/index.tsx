import { pocketbase } from './pocketbase'
import { useUserStore } from './stores/users'
import { useRefStore } from './stores/refs'
import { useItemStore } from './stores/items'
import { ExpandedItem, StagedItemFields } from './stores/types'

const addToProfile = async (
  existingRefId: string | null,
  stagedItemFields: StagedItemFields,
  backlog: boolean
): Promise<ExpandedItem> => {
  const userStore = useUserStore.getState()
  const refStore = useRefStore.getState()
  const itemStore = useItemStore.getState()

  let newItem: ExpandedItem

  if (!userStore.user) {
    throw new Error('User not found')
  }

  if (existingRefId) {
    // create a new item from an existing ref
    newItem = await itemStore.push({
      creator: userStore.user.id,
      ref: existingRefId,
      image: stagedItemFields.image,
      url: stagedItemFields.url,
      text: stagedItemFields.text,
      backlog,
    })
  } else {
    // create a new item, with a new ref
    const newRef = await refStore.push({
      creator: userStore.user.id,
      title: stagedItemFields.title,
      meta: stagedItemFields.meta,
      image: stagedItemFields.image,
    })
    newItem = await itemStore.push({
      creator: userStore.user.id,
      ref: newRef.id,
      image: stagedItemFields.image,
      url: stagedItemFields.url,
      text: stagedItemFields.text,
      backlog,
    })
  }

  return newItem
}

export { pocketbase, useUserStore, useRefStore, useItemStore, addToProfile }
