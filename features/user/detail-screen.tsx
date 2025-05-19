import { useEffect, useState } from 'react'
import { pocketbase } from '@/features/pocketbase'
import { ExpandedProfile } from '@/features/pocketbase/stores/types'
import { Details } from '@/ui'

export function UserDetailsScreen({
  userName,
  initialId,
}: {
  userName: string
  initialId: string
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

  return (
    <>
      {profile && 'id' in profile && (
        <Details
          key={initialId}
          profile={profile}
          editingRights={editingRights}
          initialId={initialId}
        ></Details>
      )}
    </>
  )
}
