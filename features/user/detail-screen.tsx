import { useEffect, useState } from 'react'
import { pocketbase } from '@/features/pocketbase'
import { Profile as ProfileType } from '@/features/pocketbase/stores/types'
import { Details } from '@/ui'
import { gridSort, createdSort } from '@/ui/profiles/sorts'

export function UserDetailsScreen({
  userName,
  initialId,
}: {
  userName: string
  initialId: string
}) {
  const [profile, setProfile] = useState<ProfileType>()
  const getProfileData = async (userName: string) => {
    try {
      console.log('fetching profile')
      const record = await pocketbase
        .collection('users')
        .getFirstListItem(`userName = "${userName}"`, { expand: 'items,items.ref' })

      console.log('setting profile')
      console.log(record)
      setProfile(record)

      console.log('setting profile items')
      const itms = record?.expand?.items?.filter((itm: Item) => !itm.backlog).sort(gridSort) || []
      const bklg = record?.expand?.items?.filter((itm: Item) => itm.backlog).sort(createdSort) || []
      console.log('done')
      console.log('-----')
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    const getProfile = async () => {
      try {
        await getProfileData(userName)
      } catch (error) {
        console.error(error)
      }
    }

    getProfile()
  }, [userName])

  return <>{profile && <Details profile={profile} initialId={initialId}></Details>}</>
}
