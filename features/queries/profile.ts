import { pocketbase } from '@/features/pocketbase'
import type { Profile, ExpandedItem } from '@/features/types'
import { createdSort } from '@/ui/profiles/sorts'
import { QUERY_WINDOWS } from '@/features/queries/queryConfig'
import { queryClient } from '@/core/queryClient'
import {
  getSnapshot,
  putSnapshot,
  snapshotKeys,
  type SnapshotReadResult,
} from '@/features/cache/snapshotStore'
import { normalizeAvatarFields } from '@/features/users/avatar'
import { gridSort } from '@/features/stores/itemFormatters'

const PERF_TRACE = process.env.EXPO_PUBLIC_PERF_HARNESS === '1'

const logProfileFetchPerf = (
  label: string,
  startedAt: number,
  extra?: Record<string, unknown>
) => {
  if (!PERF_TRACE) return
  const duration = Date.now() - startedAt
  console.log('[profile][fetch]', label, extra ? { duration, ...extra } : { duration })
}

export type ProfileData = {
  profile: Profile
  gridItems: ExpandedItem[]
  backlogItems: ExpandedItem[]
}

const PROFILE_HEADER_FIELDS =
  'id,userName,firstName,lastName,name,location,image,avatar_url,updated'

export type ProfileHeader = Pick<
  Profile,
  'id' | 'userName' | 'firstName' | 'lastName' | 'name' | 'location' | 'image' | 'avatar_url'
> & {
  updated?: Profile['updated']
}

export type ProfileHeaderSnapshot = ProfileHeader

export const profileKeys = {
  all: ['profile'] as const,
  grid: (userId: string) => ['profile', userId, 'grid'] as const,
  header: (userName: string) => ['profile', 'header', userName] as const,
}

type FetchProfileHeaderOptions = {
  userId?: string
  forceNetwork?: boolean
}

export const extractProfileHeader = (record: Profile): ProfileHeader => {
  const normalized = normalizeAvatarFields(record)
  return {
    id: record.id,
    userName: record.userName,
    firstName: record.firstName,
    lastName: record.lastName,
    name: record.name,
    location: record.location,
    image: normalized?.image,
    avatar_url: normalized?.avatar_url,
    updated: record.updated,
  }
}

export const persistProfileHeaderSnapshot = async (userId: string, header: ProfileHeader) => {
  await putSnapshot('profileSelfHeader', snapshotKeys.profileSelfHeader(userId), header, {
    timestamp: Date.now(),
  })
}

export const fetchProfileHeaderSafe = async (
  userName: string,
  options: FetchProfileHeaderOptions = {}
): Promise<ProfileHeader> => {
  const { userId: providedUserId, forceNetwork } = options
  const cacheKey = profileKeys.header(userName)

  const cachedHeader = queryClient.getQueryData<ProfileHeader>(cacheKey)

  if (!forceNetwork && cachedHeader) {
    return cachedHeader
  }

  if (!forceNetwork) {
    const snapshotUserId = providedUserId ?? cachedHeader?.id
    if (snapshotUserId) {
      const snapshot = (await getSnapshot(
        'profileSelfHeader',
        snapshotKeys.profileSelfHeader(snapshotUserId)
      )) as SnapshotReadResult<ProfileHeader> | null
      if (snapshot?.data) {
        queryClient.setQueryData(cacheKey, snapshot.data)
        return snapshot.data
      }
    }
  }

  let resolvedUserId = providedUserId
  if (!resolvedUserId) {
    resolvedUserId = cachedHeader?.id
  }

  const fetchStartedAt = PERF_TRACE ? Date.now() : 0
  const pbOptions = { fields: PROFILE_HEADER_FIELDS }
  const record = resolvedUserId
    ? await pocketbase.collection<Profile>('users').getOne(resolvedUserId, pbOptions)
    : await pocketbase
        .collection<Profile>('users')
        .getFirstListItem(`userName = "${userName}"`, pbOptions)
  logProfileFetchPerf('header.pocketbase', fetchStartedAt)

  const header = extractProfileHeader(record)
  queryClient.setQueryData(cacheKey, header)
  if (header.id) {
    await persistProfileHeaderSnapshot(header.id, header)
  }
  return header
}

export type FetchProfileParams = {
  userId: string
  includeBacklog?: boolean
}

export async function fetchProfileData(params: FetchProfileParams): Promise<ProfileData> {
  const { userId, includeBacklog = false } = params
  const totalStartedAt = PERF_TRACE ? Date.now() : 0

  const headerStartedAt = PERF_TRACE ? Date.now() : 0
  const profileRecord = await pocketbase.collection<Profile>('users').getOne(userId, {
    fields: PROFILE_HEADER_FIELDS,
  })
  logProfileFetchPerf('profile.pocketbase', headerStartedAt)
  const profile = {
    ...profileRecord,
    ...normalizeAvatarFields(profileRecord),
  } as Profile

  const gridStartedAt = PERF_TRACE ? Date.now() : 0
  const gridResponse = await pocketbase.collection<ExpandedItem>('items').getFullList({
    filter: `creator = "${userId}" && backlog = false && parent = null`,
    expand: 'ref',
    sort: 'order, -created',
  })
  let gridItems: ExpandedItem[] = []
  try {
    gridItems = gridSort([...gridResponse] as ExpandedItem[])
  } catch (error) {
    console.warn('[profile][fetch] gridSort failed, using unsorted grid', error)
    gridItems = [...gridResponse] as ExpandedItem[]
  }
  logProfileFetchPerf('grid.pocketbase', gridStartedAt, { count: gridItems.length })
  console.log('[profile][fetch] PB grid', {
    userId,
    count: gridItems.length,
    ids: gridItems.map((item) => item.id),
  })

  let backlogItems: ExpandedItem[] = []
  if (includeBacklog) {
    const backlogStartedAt = PERF_TRACE ? Date.now() : 0
    const backlogResponse = await pocketbase.collection<ExpandedItem>('items').getFullList({
      filter: `creator = "${userId}" && backlog = true && parent = null`,
      expand: 'ref',
      sort: '-created',
    })
    backlogItems = [...backlogResponse] as ExpandedItem[]
    backlogItems = backlogItems.sort(createdSort)
    logProfileFetchPerf('backlog.pocketbase', backlogStartedAt, { count: backlogItems.length })
  }

  logProfileFetchPerf('total', totalStartedAt, {
    grid: gridItems.length,
    backlog: backlogItems.length,
  })

  return {
    profile,
    gridItems,
    backlogItems,
  }
}
