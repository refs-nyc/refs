import { Heading, XStack, YStack } from '@/ui'
import { s } from '../style'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/features/stores'
import { Profile } from '@/features/types'
import UserListItem from '@/ui/atoms/UserListItem'
import { router } from 'expo-router'
import { Text, View } from 'react-native'

type SearchResult = Profile & { sharedRefCount: number }

export default function SearchResultsScreen({ refIds }: { refIds: string[] }) {
  const [results, setResults] = useState<SearchResult[]>([])
  const { user: currentUser, getItemsByRefIds, getAllItemsByCreator, setProfileNavIntent } = useAppStore()

  useEffect(() => {
    const getSearchResults = async () => {
      try {
        const items = await getItemsByRefIds(refIds)

        const userItems = new Map<string, { user: Profile; refs: Set<string> }>()

        for (const item of items) {
          const user = item.expand?.creator
          const refId = item.expand?.ref?.id
          if (!user || !refId || user.id === currentUser?.id) continue

          if (!userItems.has(user.id)) {
            userItems.set(user.id, { user, refs: new Set() })
          }
          userItems.get(user.id)!.refs.add(refId)
        }

        const results = Array.from(userItems.values())
          .filter(({ refs }) => refIds.every((id) => refs.has(id)))
          .map((value) => {
            return { ...value.user, sharedRefCount: 0 }
          })

        const currentUserRefs = await getAllItemsByCreator(currentUser?.id!)

        const currentUserRefIds = [...new Set(currentUserRefs.map((itm) => itm.expand.ref.id))]

        for (const user of results) {
          const userAllRefs = await getAllItemsByCreator(user.id)
          const userRefIds = [...new Set(userAllRefs.map((itm) => itm.expand.ref.id))]

          user.sharedRefCount = currentUserRefIds.filter((id) => userRefIds.includes(id)).length
          results.sort((a, b) => b.sharedRefCount - a.sharedRefCount)
        }

        setResults(results)
      } catch (error) {
        console.error(error)
      }
    }

    if (refIds.length) getSearchResults()
  }, [refIds])

  return (
    <YStack gap={s.$1} style={{ flex: 1, padding: s.$1, paddingTop: s.$2 }}>
      <XStack
        gap={s.$1}
        style={{
          alignItems: 'center',
          paddingBottom: s.$1,
          paddingLeft: s.$1,
          paddingTop: s.$1,
        }}
      >
        <Heading tag="h2semi">Search</Heading>
      </XStack>
      <YStack gap={0} style={{ flex: 1 }}>
        {results.length ? (
          results.map((result) => (
            <UserListItem
              key={result.id}
              user={result}
              small={false}
              onPress={() => {
                setProfileNavIntent({ targetPagerIndex: 0, source: 'other' })
                router.push(`/user/${result.userName}`)
              }}
              text={result.sharedRefCount + ' refs shared'}
            />
          ))
        ) : (
          <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            <Text>No results found</Text>
          </View>
        )}
      </YStack>
    </YStack>
  )
}
