import { pocketbase } from './pocketbase'
import { useUserStore } from './stores/users'
import { useProfileStore } from './stores/profiles'
import { useRefStore } from './stores/refs'
import { useItemStore } from './stores/items'
import { StagedRef } from './stores/types'

// Combined
//
//
const addToProfile = async (stagedRef: StagedRef, attach = true) => {
  const refStore = useRefStore.getState()
  const itemStore = useItemStore.getState()
  const userStore = useUserStore.getState()

  let newItem = {}
  let newRef = {}

  if (stagedRef.id) {
    newItem = await itemStore.push({
      ref: stagedRef.id,
      backlog: stagedRef?.backlog,
      title: stagedRef?.title,
      text: stagedRef?.text,
      image: stagedRef?.image?.uri,
    })
  } else {
    // Add a new ref and link it
    newRef = await refStore.push(stagedRef)

    newItem = await itemStore.push({
      ...newRef,
      text: stagedRef?.text,
      backlog: stagedRef?.backlog,
      ref: newRef.id,
    })
  }

  // If the userProfile is set, attach item ID to items
  if (attach) {
    await userStore.attachItem(newItem.id)
  } else {
    let items = userStore.stagedProfile?.items || []

    await userStore.updateStagedProfile({ items: [...items, newItem.id] })
  }

  return { ref: newRef, item: newItem }
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

export {
  pocketbase,
  useUserStore,
  useProfileStore,
  useRefStore,
  useItemStore,
  addToProfile,
  removeFromProfile,
}
