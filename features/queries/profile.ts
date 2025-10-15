import { pocketbase } from '@/features/pocketbase'
import { getProfileItems, getBacklogItems } from '@/features/stores/items'
import type { Profile, ExpandedItem } from '@/features/types'
import { QUERY_WINDOWS } from '@/features/queries/queryConfig'
import { queryClient } from '@/core/queryClient'
import {
  getSnapshot,
  putSnapshot,
  snapshotKeys,
  type SnapshotReadResult,
} from '@/features/cache/snapshotStore'
import { normalizeAvatarFields } from '@/features/users/avatar'

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
  detail: (userName: string) => ['profile', userName] as const,
  header: (userName: string) => ['profile', 'header', userName] as const,
}

export type FetchProfileOptions = {
  forceNetwork?: boolean
  userId?: string
  includeBacklog?: boolean
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

export async function fetchProfileData(userName: string, options: FetchProfileOptions = {}): Promise<ProfileData> {
  const startedAt = Date.now()
  const totalStartedAt = PERF_TRACE ? Date.now() : 0
  if (__DEV__) {
    console.log('[boot-trace] profile.fetch:start', userName)
  }
  if (PERF_TRACE) {
    console.log('[profile][fetch] start', { userName, forceNetwork: options.forceNetwork ?? false })
  }

  const cachedHeader = queryClient.getQueryData<ProfileHeader>(profileKeys.header(userName))
  const header = await fetchProfileHeaderSafe(userName, {
    userId: options.forceNetwork ? options.userId : options.userId ?? cachedHeader?.id,
    forceNetwork: options.forceNetwork,
  })
  const request = {
    userName,
    userId: header.id,
    forceNetwork: options.forceNetwork,
  }

  const gridPromise = (async () => {
    const started = PERF_TRACE ? Date.now() : 0
    const result = await getProfileItems(request)
    logProfileFetchPerf('getProfileItems', started, { count: result.length })
    return result
  })()

  const backlogPromise = options.includeBacklog
    ? (async () => {
        const started = PERF_TRACE ? Date.now() : 0
        const result = await getBacklogItems(request)
        logProfileFetchPerf('getBacklogItems', started, { count: result.length })
        return result
      })()
    : Promise.resolve<ExpandedItem[]>([])

  const [gridItems, backlogItems] = await Promise.all([gridPromise, backlogPromise])

  if (__DEV__) {
    console.log('[boot-trace] profile.fetch:complete', userName, {
      duration: Date.now() - startedAt,
      gridCount: gridItems.length,
      backlogCount: backlogItems.length,
    })
  }

  logProfileFetchPerf('total', totalStartedAt, {
    grid: gridItems.length,
    backlog: backlogItems.length,
  })

  return {
    profile: header as Profile,
    gridItems,
    backlogItems: backlogItems as ExpandedItem[],
  }
}
