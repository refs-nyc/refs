import { pocketbase } from './pocketbase'
import { useUserStore } from './stores/users'
import { useRefStore } from './stores/refs'
import { useItemStore } from './stores/items'
import { StagedRef, CompleteRef, Item, ExpandedItem } from './stores/types'

const addToProfile: (
  stagedRef: StagedRef | CompleteRef,
  options: { text?: string; backlog?: boolean; list?: boolean }
) => Promise<ExpandedItem> = async (stagedRef, options = {}) => {
  console.log('WE GOT STAGED', 'list' in stagedRef ? stagedRef.list : null)
  console.log('WE GOT OPTIONS', options.list)

  const refStore = useRefStore.getState()
  const itemStore = useItemStore.getState()

  let newItem: ExpandedItem

  if (stagedRef.id) {
    // create a new item from an existing ref
    const existingRef = stagedRef
    newItem = await itemStore.push({
      ref: existingRef.id,
      image: existingRef?.image,
      creator: pocketbase.authStore?.record?.id,
      text: options.text,
      backlog: !!options.backlog,
    })
  } else {
    // create a new item, with a new ref
    const newRef = await refStore.push({ ...stagedRef, creator: pocketbase.authStore?.record?.id })
    newItem = await itemStore.push({
      ref: newRef.id,
      image: newRef.image,
      creator: pocketbase.authStore?.record?.id || '',
      text: options.text,
      backlog: !!options.backlog,
      list: !!options.list,
    })
  }

  return newItem
}

const removeFromProfile = async (itemId: string) => {
  const userStore = useUserStore.getState()

  await userStore.removeItem(itemId)
  await pocketbase.collection('items').delete(itemId)
}

export { pocketbase, useUserStore, useRefStore, useItemStore, addToProfile, removeFromProfile }
