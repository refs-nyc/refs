import { pocketbase } from './pocketbase'
import { useUserStore } from './stores/users'
import { useRefStore } from './stores/refs'
import { useItemStore } from './stores/items'
import { StagedRef, CompleteRef, Item } from './stores/types'

const addToProfile = async (
  stagedRef: StagedRef | CompleteRef,
  attach = true,
  options: { comment?: string; backlog?: boolean; list?: boolean } = {}
) => {
  if ((!pocketbase.authStore?.isValid || !pocketbase.authStore?.record) && attach)
    throw new Error('Not enough permissions')

  console.log('WE GOT STAGED', stagedRef?.list)
  console.log('WE GOT OPTIONS', options.list)

  const refStore = useRefStore.getState()
  const itemStore = useItemStore.getState()
  const userStore = useUserStore.getState()

  let newItem: Item

  if (stagedRef.id) {
    // create a new item from an existing ref
    const existingRef = stagedRef
    newItem = await itemStore.push({
      ref: existingRef.id,
      image: existingRef?.image,
      creator: pocketbase.authStore?.record?.id,
      text: options.comment,
      backlog: !!options.backlog,
    })
  } else {
    // create a new item, with a new ref
    const newRef = await refStore.push({ ...stagedRef, creator: pocketbase.authStore?.record?.id })
    newItem = await itemStore.push({
      ref: newRef.id,
      image: newRef.image,
      creator: pocketbase.authStore?.record?.id || '',
      text: options.comment,
      backlog: !!options.backlog,
      list: !!options.list,
    })
  }

  // If the userProfile is set, attach item ID to items
  if (attach) {
    await userStore.attachItem(newItem.id)
  } else if (userStore.stagedUser) {
    const items = userStore.stagedUser.items || []
    await userStore.updateStagedUser({ items: [...items, newItem.id] })
  }

  return newItem
}

const removeFromProfile = async (itemId: string) => {
  const userStore = useUserStore.getState()

  await userStore.removeItem(itemId)
  await pocketbase.collection('items').delete(itemId)
}

export { pocketbase, useUserStore, useRefStore, useItemStore, addToProfile, removeFromProfile }
