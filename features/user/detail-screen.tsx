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
  const [canAdd, setCanAdd] = useState(false)

  useEffect(() => {
    const getProfileAsync = async () => {
      setCanAdd(pocketbase?.authStore?.record?.userName === userName)
      try {
        await getProfile(userName)
      } catch (error) {
        console.error(error)
      }
    }

    getProfileAsync()
  }, [userName])

  return (
    <>{profile && 'id' in profile && <Details canAdd={canAdd} initialId={initialId}></Details>}</>
  )
}
