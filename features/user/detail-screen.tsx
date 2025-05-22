import { useEffect, useState } from 'react'
import { pocketbase } from '@/features/pocketbase'
import { ExpandedProfile } from '@/features/pocketbase/stores/types'
import { Details } from '@/ui'
import { ProfileDetailsProvider } from '@/ui/profiles/profileDetailsStore'
import { gridSort } from '@/ui/profiles/sorts'

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

  useEffect(() => {
    const getProfileAsync = async () => {
      const record = await pocketbase
        .collection('users')
        .getFirstListItem<ExpandedProfile>(`userName = "${userName}"`, {
          expand: 'items,items.ref,items.children',
        })
      setProfile(record)
    }

    getProfileAsync()
  }, [userName])

  const editingRights = pocketbase?.authStore?.record?.userName === userName

  if (profile && 'id' in profile) {
    const data = [...profile.expand.items].filter((itm) => !itm.backlog).sort(gridSort)

    const initialIndex = Math.max(
      0,
      data.findIndex((itm) => itm.id === initialId)
    )

    return (
      <ProfileDetailsProvider initialIndex={initialIndex}>
        <Details data={data} editingRights={editingRights} openedFromFeed={openedFromFeed} />
      </ProfileDetailsProvider>
    )
  } else {
    return null
  }
}
