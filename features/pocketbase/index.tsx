import { pocketbase } from './pocketbase'
import { useUserStore } from './stores/users'
import { useRefStore } from './stores/refs'
import { useItemStore } from './stores/items'
import { StagedRef } from './stores/types'

// Combined
//
//
const addToProfile = async (stagedRef: StagedRef, attach = true) => {
  if (!pocketbase.authStore.isValid || !pocketbase.authStore.record)
    throw new Error('Not enough permissions')

  const refStore = useRefStore.getState()
  const itemStore = useItemStore.getState()
  const userStore = useUserStore.getState()

  let newItem = {}

  if (stagedRef.id) {
    newItem = await itemStore.push({
      ref: stagedRef.id,
      backlog: stagedRef?.backlog,
      title: stagedRef?.title,
      text: stagedRef?.text,
      image: stagedRef?.image?.uri,
      creator: pocketbase.authStore?.record?.id,
      type: stagedRef?.type,
      list: stagedRef?.list,
    })
  } else {
    try {
      // Add a new ref and link it
      console.log('NEW REF')
      const newRef = await refStore.push({ ...stagedRef, creator: pocketbase.authStore.record.id })
      console.log('NEW REF', newRef)
      console.log('----')
      console.log('NEW ITEM')
      const data = {
        ...newRef,
        text: stagedRef?.text,
        backlog: stagedRef?.backlog,
        ref: newRef.id,
        list: stagedRef?.list,
        creator: pocketbase.authStore?.record?.id,
      }
      console.log(data)
      newItem = await itemStore.push(data)
      console.log('LIST? ', stagedRef?.list)
      console.log('NEW ITEM,', newItem)
    } catch (error) {
      console.error(error)
    }
  }

  // If the userProfile is set, attach item ID to items
  if (attach) {
    try {
      await userStore.attachItem(newItem.id)
    } catch (error) {
      console.error(error)
    }
  } else {
    let items = userStore.stagedProfile?.items || []

    try {
      await userStore.updateStagedUser({ items: [...items, newItem.id] })
    } catch (error) {
      console.error(error)
    }
  }

  console.log(newItem)

  return newItem
}

//
//
//
const removeFromProfile = async (itemId: string) => {
  const userStore = useUserStore.getState()

  try {
    await userStore.removeItem(itemId)
    await pocketbase.collection('items').delete(itemId)
  } catch (error) {
    throw Error(error)
  }
}

export { pocketbase, useUserStore, useRefStore, useItemStore, addToProfile, removeFromProfile }
