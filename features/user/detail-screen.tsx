import { useEffect, useState } from 'react'
import { pocketbase } from '@/features/pocketbase'
import { Profile as ProfileType } from '@/features/pocketbase/stores/types'
import { Details } from '@/ui'
import { useUserStore } from '@/features/pocketbase/stores/users'

export function UserDetailsScreen({
  userName,
  initialId,
}: {
  userName: string
  initialId: string
}) {
  const { profile, getProfile } = useUserStore()
  const [editingRights, setEditingRights] = useState(false)

  console.log('initialId', initialId)

  useEffect(() => {
    const getProfileAsync = async () => {
      setEditingRights(pocketbase?.authStore?.record?.userName === userName)
      try {
        await getProfile(userName)
      } catch (error) {
        console.error(error)
      }
    }

    getProfileAsync()
  }, [userName])

  return (
    <>
      {profile && 'id' in profile && (
        <Details key={initialId} editingRights={editingRights} initialId={initialId}></Details>
      )}
    </>
  )
}
