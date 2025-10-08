import { useCallback, useEffect, useRef } from 'react'
import { pocketbase } from '@/features/pocketbase'
import { useAppStore } from '@/features/stores'
import {
  Conversation,
  ExpandedMembership,
  ExpandedReaction,
  ExpandedSave,
  Message,
  Reaction,
} from '@/features/types'
import { ConversationsResponse } from '@/features/pocketbase/pocketbase-types'
import { simpleCache } from '@/features/cache/simpleCache'
import { constructPinataUrl } from '@/features/pinata'
import { s } from '@/features/style'
import { PixelRatio } from 'react-native'

type ConversationPreviewCacheEntry = {
  conversationId: string
  message: Message | null
  unreadCount: number
}

type ExpandedConversation = ConversationsResponse<{
  memberships_via_conversation: ExpandedMembership[]
}>

const CONVERSATION_PAGE_SIZE = 20
const PREVIEW_BATCH_SIZE = 4

const pause = (ms = 0) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

const chunk = <T,>(items: T[], size: number): T[][] => {
  if (size <= 0) return []
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}

export function MessagesInit() {
  const {
    user,
    setConversations,
    setMemberships,
    setReactions,
    setSaves,
    addNewMessage,
    addConversation,
    addMembership,
    addReaction,
    removeReaction,
    updateMembership,
    setConversationPreview,
    setConversationPreviews,
    setConversationUnreadCount,
    getSignedUrl,
  } = useAppStore()

  const prefetchedAvatarUrlsRef = useRef<Set<string>>(new Set())
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const cancelledRef = useRef(false)
  const conversationAccumulatorRef = useRef<Map<string, ExpandedConversation>>(new Map())
  const membershipAccumulatorRef = useRef<Map<string, ExpandedMembership>>(new Map())
  const previewAccumulatorRef = useRef<Map<string, ConversationPreviewCacheEntry>>(new Map())

  const prefetchAvatarSignedUrls = useCallback(
    (memberships: ExpandedMembership[]) => {
      if (!memberships.length) return

      const scale = PixelRatio.get()
      const avatarDimension = Math.round(((s.$5 as number) || 52) * scale)

      const requests: Promise<unknown>[] = []

      memberships.forEach((membership) => {
        const image = membership.expand?.user?.image
        if (!image) return

        const optimizedUrl = constructPinataUrl(image, {
          width: avatarDimension,
          height: avatarDimension,
        })

        if (!optimizedUrl) return
        if (prefetchedAvatarUrlsRef.current.has(optimizedUrl)) return

        prefetchedAvatarUrlsRef.current.add(optimizedUrl)

        requests.push(
          getSignedUrl(optimizedUrl).catch((error) => {
            prefetchedAvatarUrlsRef.current.delete(optimizedUrl)
            console.warn('prefetchAvatarSignedUrls failed', { optimizedUrl, error })
          })
        )
      })

      if (requests.length) {
        Promise.allSettled(requests).catch(() => {})
      }
    },
    [getSignedUrl]
  )

  const fetchConversationPreview = useCallback(
    async (
      conversationId: string,
      membershipIndex: Map<string, ExpandedMembership>,
      membershipOverride?: ExpandedMembership
    ): Promise<ConversationPreviewCacheEntry> => {
      try {
        const latestResponse = await pocketbase.collection('messages').getList<Message>(1, 1, {
          filter: `conversation = "${conversationId}"`,
          sort: '-created',
        })

        const latest = latestResponse.items[0] ?? null
        const totalMessages = latestResponse.totalItems ?? (latest ? 1 : 0)

        const membership = membershipOverride ?? membershipIndex.get(conversationId)
        let unreadCount = 0

        const lastRead = membership?.last_read
        const latestCreated = latest?.created

        if (!lastRead) {
          unreadCount = totalMessages
        } else if (latestCreated && new Date(latestCreated) > new Date(lastRead)) {
          const unreadResponse = await pocketbase.collection('messages').getList<Message>(1, 1, {
            filter: `conversation = "${conversationId}" && created > "${lastRead}"`,
            sort: '-created',
          })
          unreadCount = unreadResponse.totalItems ?? unreadResponse.items.length
        }

        return {
          conversationId,
          message: latest ?? null,
          unreadCount,
        }
      } catch (error) {
        console.warn('Failed to build conversation preview', { conversationId, error })
        return {
          conversationId,
          message: null,
          unreadCount: 0,
        }
      }
    },
    []
  )

  useEffect(() => {
    if (!user?.id) return

    cancelledRef.current = false
    queueRef.current = Promise.resolve()

    const cacheTimeouts: ReturnType<typeof setTimeout>[] = []
    const conversationAccumulator = conversationAccumulatorRef.current
    const membershipAccumulator = membershipAccumulatorRef.current
    const previewAccumulator = previewAccumulatorRef.current

    const schedule = (task: () => Promise<void> | void, delay = 0) => {
      queueRef.current = queueRef.current
        .then(async () => {
          if (cancelledRef.current) return
          if (delay) await pause(delay)
          if (cancelledRef.current) return
          await task()
        })
        .catch((error) => {
          console.error('Messaging preload task failed', error)
        })
    }

    const queueCacheWrite = (key: 'conversations' | 'conversation_memberships' | 'conversation_previews', value: unknown) => {
      const handle = setTimeout(() => {
        if (cancelledRef.current) return
        void simpleCache.set(key as any, value, user.id).catch((error) => {
          console.warn(`Persisting ${key} cache failed`, error)
        })
      }, 0)
      cacheTimeouts.push(handle)
    }

    const getSortTimestamp = (conversation: ExpandedConversation) =>
      ((conversation as any).updated as string | undefined) ??
      ((conversation as any).created as string | undefined) ??
      ''

    const toSortedConversations = () => {
      const list = Array.from(conversationAccumulator.values())
      list.sort((a, b) => getSortTimestamp(b).localeCompare(getSortTimestamp(a)))
      return list
    }

    const applyConversationBatch = (batch: ExpandedConversation[]) => {
      if (!batch.length) return
      batch.forEach((conversation) => {
        conversationAccumulator.set(conversation.id, conversation)
      })
      const sorted = toSortedConversations()
      setConversations(sorted as unknown as Conversation[])
      queueCacheWrite('conversations', sorted)
    }

    const applyMembershipBatch = (memberships: ExpandedMembership[]) => {
      if (!memberships.length) return
      memberships.forEach((membership) => {
        membershipAccumulator.set(membership.id, membership)
      })
      const next = Array.from(membershipAccumulator.values())
      setMemberships(next)
      prefetchAvatarSignedUrls(memberships)
      queueCacheWrite('conversation_memberships', next)
    }

    const applyPreviewEntry = (entry: ConversationPreviewCacheEntry) => {
      previewAccumulator.set(entry.conversationId, entry)
      setConversationPreview(entry.conversationId, entry.message, entry.unreadCount ?? 0)
    }

    const flushPreviewCache = () => {
      const previews = Array.from(previewAccumulator.values())
      if (!previews.length) return
      queueCacheWrite('conversation_previews', previews)
    }

    const hydrateFromCache = async () => {
      try {
        const [cachedConversations, cachedMemberships, cachedPreviews] = await Promise.all([
          simpleCache.get<ExpandedConversation[]>('conversations', user.id),
          simpleCache.get<ExpandedMembership[]>('conversation_memberships', user.id),
          simpleCache.get<ConversationPreviewCacheEntry[]>('conversation_previews', user.id),
        ])

        if (cancelledRef.current) return

        if (cachedConversations?.length) {
          cachedConversations.forEach((conversation) => {
            conversationAccumulator.set(conversation.id, conversation)
          })
          const sorted = toSortedConversations()
          setConversations(sorted as unknown as Conversation[])

          if (!cachedMemberships?.length) {
            const flattened = cachedConversations.flatMap((conversation) =>
              (conversation.expand?.memberships_via_conversation || []).map((membership) => ({
                ...membership,
                conversation: membership.conversation ?? conversation.id,
              }))
            ) as ExpandedMembership[]
            if (flattened.length) {
              applyMembershipBatch(flattened)
            }
          }
        }

        if (cachedMemberships?.length) {
          applyMembershipBatch(cachedMemberships)
        }

        if (cachedPreviews?.length) {
          previewAccumulator.clear()
          cachedPreviews.forEach((preview) => {
            previewAccumulator.set(preview.conversationId, preview)
          })
          setConversationPreviews(
            cachedPreviews.map((preview) => ({
              conversationId: preview.conversationId,
              message: preview.message,
              unreadCount: preview.unreadCount ?? 0,
            }))
          )
        }
      } catch (error) {
        console.warn('Failed to hydrate messaging cache', error)
      }
    }

    const flattenMemberships = (batch: ExpandedConversation[]) => {
      const flattened: ExpandedMembership[] = []
      batch.forEach((conversation) => {
        const memberships = conversation.expand?.memberships_via_conversation || []
        memberships.forEach((membership) => {
          flattened.push({
            ...membership,
            conversation: membership.conversation ?? conversation.id,
          } as ExpandedMembership)
        })
      })
      return flattened
    }

    const buildMembershipIndex = () => {
      const map = new Map<string, ExpandedMembership>()
      membershipAccumulator.forEach((membership) => {
        if (membership.expand?.user?.id === user.id) {
          map.set(membership.conversation, membership)
        }
      })
      return map
    }

    const buildPreviewBatch = async (conversations: ExpandedConversation[]) => {
      if (!conversations.length) return
      const membershipIndex = buildMembershipIndex()
      for (const conversation of conversations) {
        if (cancelledRef.current) break
        const preview = await fetchConversationPreview(
          conversation.id,
          membershipIndex
        )
        if (cancelledRef.current) break
        applyPreviewEntry(preview)
        await pause()
      }
      flushPreviewCache()
    }

    const loadConversationPage = async (page: number) => {
      try {
        const response = await pocketbase
          .collection('conversations')
          .getList<ExpandedConversation>(page, CONVERSATION_PAGE_SIZE, {
            sort: '-created',
            expand: 'memberships_via_conversation.user',
          })

        if (cancelledRef.current) return null

        const items = response.items ?? []
        if (items.length) {
          applyConversationBatch(items)
          const flattened = flattenMemberships(items)
          if (flattened.length) {
            applyMembershipBatch(flattened)
          }
        }

        return {
          items,
          totalPages: response.totalPages ?? 1,
        }
      } catch (error) {
        console.error('Failed to load conversations page', error)
        return null
      }
    }

    const warmAdditionalPages = async (startPage: number, totalPages: number) => {
      for (let page = startPage; page <= totalPages; page += 1) {
        if (cancelledRef.current) break
        await pause(24)
        const result = await loadConversationPage(page)
        if (!result?.items?.length || cancelledRef.current) continue
        const chunks = chunk(result.items, PREVIEW_BATCH_SIZE)
        for (const batch of chunks) {
          if (cancelledRef.current) break
          await buildPreviewBatch(batch)
        }
      }
    }

    const loadReactions = async () => {
      try {
        const reactions = await pocketbase.collection('reactions').getFullList<ExpandedReaction>({ expand: 'user' })
        if (cancelledRef.current || !reactions.length) return
        setReactions(reactions)
      } catch (error) {
        console.error('Failed to load reactions', error)
      }
    }

    const loadSaves = async () => {
      try {
        const saves = await pocketbase.collection('saves').getFullList<ExpandedSave>({ expand: 'user' })
        if (cancelledRef.current || !saves.length) return
        setSaves(saves)
      } catch (error) {
        console.error('Failed to load saves', error)
      }
    }

    schedule(hydrateFromCache)

    schedule(async () => {
      const firstPage = await loadConversationPage(1)
      if (!firstPage?.items?.length || cancelledRef.current) return

      const firstBatch = firstPage.items.slice(0, PREVIEW_BATCH_SIZE)
      if (firstBatch.length) {
        schedule(() => buildPreviewBatch(firstBatch))
      }

      const remaining = firstPage.items.slice(PREVIEW_BATCH_SIZE)
      if (remaining.length) {
        const batches = chunk(remaining, PREVIEW_BATCH_SIZE)
        batches.forEach((batch, index) => {
          schedule(() => buildPreviewBatch(batch), 12 * (index + 1))
        })
      }

      if (firstPage.totalPages > 1) {
        schedule(() => warmAdditionalPages(2, firstPage.totalPages), 32)
      }
    })

    schedule(loadReactions, 48)
    schedule(loadSaves, 64)

    return () => {
      cancelledRef.current = true
      cacheTimeouts.forEach((timeout) => clearTimeout(timeout))
      queueRef.current = Promise.resolve()
    }
  }, [
    user?.id,
    setConversations,
    setMemberships,
    setReactions,
    setSaves,
    setConversationPreview,
    setConversationPreviews,
    fetchConversationPreview,
    prefetchAvatarSignedUrls,
  ])

  // subscribe to new messages
  useEffect(() => {
    if (!user) return
    try {
      pocketbase.collection('messages').subscribe<Message>('*', (event) => {
        if (event.action === 'create') {
          addNewMessage(event.record.conversation!, event.record)
        }
      })
    } catch (error) {
      console.error(error)
    }

    return () => {
      pocketbase.collection('messages').unsubscribe('*')
    }
  }, [user?.id, addNewMessage])

  // subscribe to reactions
  useEffect(() => {
    if (!user) return
    try {
      pocketbase.collection('reactions').subscribe<Reaction>('*', async (event) => {
        if (event.action === 'create') {
          const expandedReaction = await pocketbase
            .collection('reactions')
            .getOne<ExpandedReaction>(event.record.id, { expand: 'user' })
          addReaction(expandedReaction)
        }
        if (event.action === 'delete') {
          removeReaction(event.record)
        }
      })
    } catch (error) {
      console.error(error)
    }

    return () => {
      pocketbase.collection('reactions').unsubscribe('*')
    }
  }, [user?.id, addReaction, removeReaction])

  // subscribe to membership updates (to see new conversations)
  useEffect(() => {
    if (!user) return

    let cancelled = false

    try {
      pocketbase.collection('memberships').subscribe('*', async (event) => {
        if (event.action === 'update') {
          const expandedMembership = await pocketbase
            .collection('memberships')
            .getOne<ExpandedMembership>(event.record.id, { expand: 'user' })
          updateMembership(expandedMembership)

          if (expandedMembership.expand?.user?.id === user.id) {
            setConversationUnreadCount(expandedMembership.conversation, 0)
          }
        }
        if (event.action === 'create') {
          const expandedMembership = await pocketbase
            .collection('memberships')
            .getOne<ExpandedMembership>(event.record.id, { expand: 'user' })
          try {
            addMembership(expandedMembership)
          } catch (error) {
            console.error('error adding membership')
            console.error(error)
          }
          if (event.record.user === user.id) {
            const conversation = await pocketbase
              .collection('conversations')
              .getOne<ExpandedConversation>(event.record.conversation, {
                expand: 'memberships_via_conversation.user',
              })
            addConversation(conversation as unknown as Conversation)

            const expandedMemberships =
              conversation.expand?.memberships_via_conversation || ([] as ExpandedMembership[])
            expandedMemberships.forEach((membership) => {
              try {
                addMembership(membership)
              } catch (error) {
                console.error('error adding membership')
                console.error(error)
              }
            })

            prefetchAvatarSignedUrls(expandedMemberships)

            const singleIndex = new Map<string, ExpandedMembership>([
              [conversation.id, expandedMembership],
            ])
            const preview = await fetchConversationPreview(conversation.id, singleIndex, expandedMembership)
            if (!cancelled) {
              setConversationPreview(preview.conversationId, preview.message, preview.unreadCount)
            }
          }
        }
      })
    } catch (error) {
      console.error(error)
    }
    return () => {
      cancelled = true
      pocketbase.collection('memberships').unsubscribe('*')
    }
  }, [
    user?.id,
    addConversation,
    addMembership,
    updateMembership,
    setConversationPreview,
    setConversationUnreadCount,
    fetchConversationPreview,
  ])

  return null
}
