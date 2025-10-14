import { useQuery } from '@tanstack/react-query'

import { pocketbase } from '@/features/pocketbase'
import type { ExpandedSave } from '@/features/types'

export const wantToMeetKeys = {
  all: ['wantToMeet'] as const,
  list: (userId: string) => ['wantToMeet', userId] as const,
}

export async function fetchWantToMeet(userId: string): Promise<ExpandedSave[]> {
  if (!userId) {
    return []
  }

  const saves = await pocketbase.collection('saves').getFullList<ExpandedSave>({
    filter: pocketbase.filter('saved_by = {:userId}', { userId }),
    expand: 'user',
    sort: '-created',
  })

  return saves
}

export function useWantToMeet(userId?: string) {
  return useQuery({
    queryKey: userId ? wantToMeetKeys.list(userId) : wantToMeetKeys.list('guest'),
    queryFn: () => fetchWantToMeet(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
}
