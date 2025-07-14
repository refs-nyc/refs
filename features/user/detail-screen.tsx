import { useEffect, useState } from 'react'
import { pocketbase } from '@/features/pocketbase'
import { getProfileItems } from '@/features/stores/items'
import { ExpandedItem } from '@/features/pocketbase/types'
import { Details } from '@/ui'
import { ProfileDetailsProvider } from '@/ui/profiles/profileDetailsStore'
import { ActivityIndicator } from 'react-native'

export function UserDetailsScreen({
  userName,
  initialId,
  openedFromFeed,
}: {
  userName: string
  initialId: string
  openedFromFeed: boolean
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState<ExpandedItem[]>([])

  useEffect(() => {
    async function getProfileItemsAsync() {
      setIsLoading(true)
      const items = await getProfileItems(userName)
      setItems(items)
      setIsLoading(false)
    }
    getProfileItemsAsync()
  }, [userName])

  const editingRights = pocketbase?.authStore?.record?.userName === userName

  const initialIndex = Math.max(
    0,
    items.findIndex((itm) => itm.id === initialId)
  )

  return isLoading ? (
    <ActivityIndicator />
  ) : (
    <ProfileDetailsProvider
      editingRights={editingRights}
      initialIndex={initialIndex}
      openedFromFeed={openedFromFeed}
    >
      <Details data={items} />
    </ProfileDetailsProvider>
  )
}
