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

  useEffect(() => {
    const getProfileAsync = async () => {
      try {
        await getProfile(userName)
      } catch (error) {
        console.error(error)
      }
    }

    getProfileAsync()
  }, [userName])

  return <>{profile && ("id" in profile) && <Details initialId={initialId}></Details>}</>
}
