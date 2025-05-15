import { Heading, YStack } from '@/ui'
import { s } from '../style'
import { useEffect, useState } from 'react'
import { pocketbase } from '../pocketbase'
import { ExpandedItem, Profile } from '../pocketbase/stores/types'
import UserListItem from '@/ui/atoms/UserListItem'

export default function SearchResultsScreen({ refIds }: { refIds: string[] }) {
  const [results, setResults] = useState<Profile[]>([])

  useEffect(() => {
    const getSearchResults = async () => {
      try {
        const filter = refIds.map((id) => `ref="${id}"`).join(' || ')

        const items = await pocketbase.collection('items').getFullList<ExpandedItem>({
          filter,
          expand: 'ref,creator',
          sort: '-creator',
        })

        const userItems = new Map<string, { user: Profile; refs: Set<string> }>()

        for (const item of items) {
          const user = item.expand?.creator
          const refId = item.expand?.ref?.id
          if (!user || !refId) continue

          if (!userItems.has(user.id)) {
            userItems.set(user.id, { user, refs: new Set() })
          }
          userItems.get(user.id)!.refs.add(refId)
        }

        const results = Array.from(userItems.values())
          .filter(({ refs }) => refIds.every((id) => refs.has(id)))
          .map(({ user }) => user)

        setResults(results)
      } catch (error) {
        console.error(error)
      }
    }

    if (refIds.length) getSearchResults()
  }, [refIds])

  return (
    <YStack gap={s.$1} style={{ flex: 1, padding: s.$1 }}>
      <Heading tag="h1">Results</Heading>
      <YStack gap={0} style={{ flex: 1 }}>
        {results.map((result) => (
          <UserListItem key={result.id} user={result} />
        ))}
      </YStack>
    </YStack>
  )
}
