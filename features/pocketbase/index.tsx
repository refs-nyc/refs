import { pocketbase } from './pocketbase'
import { useUserStore } from './stores/users'
import { useRefStore } from './stores/refs'
import { useItemStore } from './stores/items'
import { StagedRef, CompleteRef, ExpandedItem } from './stores/types'

const addToProfile: (
  stagedRef: StagedRef | CompleteRef,
  options: { image?: string; text?: string; backlog?: boolean; list?: boolean }
) => Promise<ExpandedItem> = async (stagedRef, options = {}) => {
  const refStore = useRefStore.getState()
  const itemStore = useItemStore.getState()

  let newItem: ExpandedItem

  if (stagedRef.id) {
    // create a new item from an existing ref
    const existingRef = stagedRef
    newItem = await itemStore.push({
      ref: existingRef.id,
      image: options.image || existingRef?.image,
      creator: pocketbase.authStore?.record?.id,
      text: options.text,
      backlog: !!options.backlog,
    })
  } else {
    // create a new item, with a new ref
    const newRef = await refStore.push({ ...stagedRef, creator: pocketbase.authStore?.record?.id })
    newItem = await itemStore.push({
      ref: newRef.id,
      image: options.image || newRef.image,
      creator: pocketbase.authStore?.record?.id || '',
      text: options.text,
      backlog: !!options.backlog,
      list: !!options.list,
    })
  }

  return newItem
}

export { pocketbase, useUserStore, useRefStore, useItemStore, addToProfile }
