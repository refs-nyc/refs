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
  const profileStore = useProfileStore.getState()

  const newRef = await refStore.push(stagedRef)

  const copiedRef = { ...newRef }

  delete copiedRef.firstReferral
  delete copiedRef.referrals

  const newItem = await itemStore.push({
    ...copiedRef,
    backlog: stagedRef?.backlog,
    ref: newRef.id,
  })

  // If the userProfile is set, attach item ID to items
  if (attach) {
    await profileStore.attachItem(newItem.id)
  } else {
    let items = profileStore.stagedProfile?.items || []

    await profileStore.updateStagedProfile({ items: [...items, newItem.id] })
  }

  return { ref: newRef, item: newItem }
}

export { useUserStore, useProfileStore, useRefStore, useItemStore, createRefWithItem }
