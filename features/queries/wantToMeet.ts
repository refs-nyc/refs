import { useQuery } from '@tanstack/react-query'

import { pocketbase } from '@/features/pocketbase'
import type { ExpandedSave } from '@/features/types'
import type { UsersRecord } from '@/features/pocketbase/pocketbase-types'

type CompactSave = ExpandedSave & {
  expand?: {
    user?: Pick<UsersRecord, 'id' | 'userName' | 'firstName' | 'lastName' | 'name' | 'image'> & {
      avatar_url?: string | null
    }
  }
}

export const wantToMeetKeys = {
  all: ['wantToMeet'] as const,
  list: (userId: string) => ['wantToMeet', userId] as const,
}

export async function fetchWantToMeet(userId: string): Promise<ExpandedSave[]> {
  if (!userId) {
    return []
  }

  const saves = await pocketbase.collection('saves').getList<CompactSave>(1, 20, {
    filter: pocketbase.filter('saved_by = {:userId}', { userId }),
    sort: '-created',
    expand: 'user',
    fields:
      'id,created,saved_by,user,expand.user.id,expand.user.userName,expand.user.firstName,expand.user.lastName,expand.user.name,expand.user.image,expand.user.avatar_url',
  })

  return saves.items as ExpandedSave[]
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
