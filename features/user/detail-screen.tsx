import { useEffect, useState } from 'react'
import { getProfileItems } from '@/features/stores/items'
import { ExpandedItem, Profile } from '@/features/types'
import { Details } from '@/ui'
import { ProfileDetailsProvider } from '@/ui/profiles/profileDetailsStore'
import { ActivityIndicator } from 'react-native'
import { useAppStore } from '../stores'
import { simpleCache } from '@/features/cache/simpleCache'

export function UserDetailsScreen({
  userName,
  initialId,
  openedFromFeed,
}: {
  userName: string
  initialId: string
  openedFromFeed: boolean
}) {
  const user = useAppStore((state) => state.user)
  const getUserByUserName = useAppStore((state) => state.getUserByUserName)
  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState<ExpandedItem[]>([])

  useEffect(() => {
    async function getProfileItemsAsync() {
      setIsLoading(true)
      try {
        let resolvedProfileId: string | undefined
        let resolvedProfile: Profile | undefined

        if (user?.userName === userName) {
          resolvedProfileId = user?.id
          resolvedProfile = user ?? undefined
        } else {
          const fetchedProfile = await getUserByUserName(userName)
          resolvedProfileId = fetchedProfile?.id
          resolvedProfile = fetchedProfile ?? undefined
        }

        const items = await getProfileItems({
          userName,
          userId: resolvedProfileId,
          forceNetwork: true,
        })
        setItems(items)

        if (resolvedProfile && resolvedProfileId) {
          const profileWithUserId = { ...resolvedProfile, _cachedUserId: resolvedProfileId }
          Promise.all([
            simpleCache.set('profile', profileWithUserId, resolvedProfileId),
            simpleCache.set('grid_items', items, resolvedProfileId),
          ]).catch((error) => {
            console.warn('UserDetailsScreen cache sync failed', error)
          })
        }
      } catch (error) {
        console.warn('Failed to load profile items', error)
        setItems([])
      } finally {
        setIsLoading(false)
      }
    }
    getProfileItemsAsync()
  }, [getUserByUserName, user?.id, user?.userName, userName])

  const editingRights = user?.userName === userName

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
