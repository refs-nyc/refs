import { useEffect, useState } from 'react'
import { pocketbase } from '@/features/pocketbase'
import { ExpandedProfile } from '@/features/pocketbase/stores/types'
import { Details } from '@/ui'
import { ProfileDetailsProvider } from '@/ui/profiles/profileDetailsStore'
import { ItemsRecord } from '@/features/pocketbase/stores/pocketbase-types'
import { getProfileItems } from '@/features/pocketbase/stores/items'

export function UserDetailsScreen({
  userName,
  initialId,
  openedFromFeed,
}: {
  userName: string
  initialId: string
  openedFromFeed: boolean
}) {
  const [profile, setProfile] = useState<ExpandedProfile | null>(null)
  const [items, setItems] = useState<ItemsRecord[]>([])

  useEffect(() => {
    const getProfileAsync = async () => {
      const items = await getProfileItems(userName)
      setItems(items)

      const profile = await pocketbase
        .collection('users')
        .getFirstListItem<ExpandedProfile>(`userName = "${userName}"`)
      setProfile(profile)
    }

    getProfileAsync()
  }, [userName])

  const editingRights = pocketbase?.authStore?.record?.userName === userName

  if (profile && 'id' in profile) {
    const initialIndex = Math.max(
      0,
      items.findIndex((itm) => itm.id === initialId)
    )

    return (
      <ProfileDetailsProvider
        editingRights={editingRights}
        initialIndex={initialIndex}
        openedFromFeed={openedFromFeed}
      >
        <Details profile={profile} data={items} />
      </ProfileDetailsProvider>
    )
  } else {
    return null
  }
}
