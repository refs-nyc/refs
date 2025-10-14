import { pocketbase } from '@/features/pocketbase'
import { QUERY_WINDOWS } from '@/features/queries/queryConfig'

export type RawUser = {
  id: string
  userName: string
  firstName?: string
  lastName?: string
  name?: string
  location?: string
  image?: string
  avatar_url?: string
  updated?: string
  created?: string
  show_in_directory?: boolean
}

export type DirectoryEntry = {
  id: string
  userName: string
  name: string
  neighborhood: string
  avatarUrl: string
  topRefs: string[]
  latest?: number
}

export const directoryKeys = {
  all: ['directory'] as const,
  page: (page: number) => ['directory', page] as const,
}

const DIRECTORY_PAGE_SIZE = 50

export const mapUserRecord = (record: RawUser): DirectoryEntry => {
  const first = (record.firstName || '').trim()
  const last = (record.lastName || '').trim()
  const combined = `${first} ${last}`.trim()
  const displayName = combined || (record.name || '').trim() || record.userName

  return {
    id: record.id,
    userName: record.userName,
    name: displayName,
    neighborhood: (record.location || '').trim() || 'Elsewhere',
    avatarUrl: (record.image || record.avatar_url || '').trim(),
    topRefs: [],
    latest: record.updated ? new Date(record.updated).getTime() : undefined,
  }
}

export async function fetchDirectoryPage(page = 1) {
  const response = await pocketbase.collection('users').getList(page, DIRECTORY_PAGE_SIZE, {
    filter: 'show_in_directory = true',
    fields: 'id,userName,firstName,lastName,name,location,image,avatar_url,updated,created',
    sort: '-created',
  })

  const users = (((response.items ?? []) as unknown) as RawUser[]).map(mapUserRecord)

  return {
    users,
    hasMore: response.page < (response.totalPages ?? response.page),
    totalPages: response.totalPages ?? response.page,
  }
}

export type DirectoryPage = Awaited<ReturnType<typeof fetchDirectoryPage>>

export async function fetchDirectoryTopRefs(userIds: string[]): Promise<Map<string, { refs: string[]; latest?: number }>> {
  if (!userIds.length) return new Map<string, { refs: string[]; latest?: number }>()

  const orFilter = userIds.map((id) => `creator = "${id}"`).join(' || ')
  const perPageItems = Math.max(3 * userIds.length, 60)
  const itemsRes = await pocketbase.collection('items').getList(1, perPageItems, {
    filter: `(${orFilter}) && backlog = false && list = false && parent = null`,
    fields: 'id,image,creator,created,expand.ref(image)',
    expand: 'ref',
    sort: '-created',
  })

  const result = new Map<string, { refs: string[]; latest?: number }>()

  for (const item of itemsRes.items as any[]) {
    const creatorId = String(item.creator)
    if (!creatorId) continue
    if (!userIds.includes(creatorId)) continue
    const entry = result.get(creatorId) || { refs: [], latest: undefined }
    if (entry.refs.length < 3) {
      const refImage = item?.image || item?.expand?.ref?.image
      if (refImage) {
        entry.refs.push(refImage)
      }
    }
    const createdAt = item?.created ? new Date(item.created).getTime() : undefined
    if (createdAt && (!entry.latest || createdAt > entry.latest)) {
      entry.latest = createdAt
    }
    result.set(creatorId, entry)
  }

  return result
}
