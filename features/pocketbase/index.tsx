import { pocketbase } from './pocketbase'
import { useUserStore } from './stores/users'
import { useProfileStore } from './stores/profiles'
import { useRefStore } from './stores/refs'
import { useItemStore } from './stores/items'

// Combined
//
//
const createRefWithItem = async (stagedRef: StagedRef, attach = true) => {
  const refStore = useRefStore.getState()
  const itemStore = useItemStore.getState()
  const userStore = useUserStore.getState()

  const newRef = await refStore.push(stagedRef)

  const copiedRef = { ...newRef }

  // delete copiedRef.firstReferral
  // delete copiedRef.referrals

  const newItem = await itemStore.push({
    ...copiedRef,
    backlog: stagedRef?.backlog,
    ref: newRef.id,
  })

  // If the userProfile is set, attach item ID to items
  if (attach) {
    await userStore.attachItem(newItem.id)
  } else {
    let items = userStore.stagedProfile?.items || []

    await userStore.updateStagedProfile({ items: [...items, newItem.id] })
  }

  return { ref: newRef, item: newItem }
}

export { pocketbase, useUserStore, useProfileStore, useRefStore, useItemStore, createRefWithItem }
