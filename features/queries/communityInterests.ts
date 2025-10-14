import { pocketbase } from '@/features/pocketbase'

type InterestSummary = {
  topInterests: Array<{ refId: string; title: string; count: number; created?: string }>
  userInterestPairs: Array<[string, string[]]>
  refTitlePairs: Array<[string, string]>
}

export const communityInterestsKeys = {
  summary: (community: string) => ['communityInterests', community] as const,
}

export async function fetchCommunityInterestSummary(community: string): Promise<InterestSummary> {
  const items = await pocketbase.collection('items').getFullList({
    filter: pocketbase.filter('ref.meta ~ {:community} && backlog = false && parent = null', { community }),
    expand: 'ref,creator',
    sort: '-created',
  })

  const countByRef = new Map<string, { ref: any; count: number }>()
  const userMap = new Map<string, Set<string>>()

  for (const entry of items as any[]) {
    const ref = entry.expand?.ref
    const creator = entry.expand?.creator || { id: entry.creator }
    if (!ref?.id || !creator?.id) continue

    const refId = ref.id
    const aggregate = countByRef.get(refId) || { ref, count: 0 }
    aggregate.count += 1
    countByRef.set(refId, aggregate)

    const set = userMap.get(creator.id) || new Set<string>()
    set.add(refId)
    userMap.set(creator.id, set)
  }

  const topInterests = Array.from(countByRef.values())
    .map(({ ref, count }) => ({
      refId: ref.id,
      title: ref.title,
      count,
      created: ref.created,
    }))
    .sort((a, b) => (b.count - a.count) || (b.created || '').localeCompare(a.created || ''))

  const userInterestPairs = Array.from(userMap.entries()).map(([userId, set]) => [userId, Array.from(set)] as [string, string[]])
  const refTitlePairs = Array.from(countByRef.values()).map(({ ref }) => [ref.id, ref.title] as [string, string])

  return {
    topInterests,
    userInterestPairs,
    refTitlePairs,
  }
}
