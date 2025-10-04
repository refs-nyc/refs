
import { useCallback, useEffect, useRef } from 'react'
import { pocketbase } from '@/features/pocketbase'
import { useAppStore } from '@/features/stores'
import { PAGE_SIZE } from '@/features/stores/messages'
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
import { InteractionManager, PixelRatio } from 'react-native'
import * as Notifications from 'expo-notifications'
import { bootStep } from '@/features/debug/bootMetrics'

type ConversationPreviewCacheEntry = {
  conversationId: string
  message: Message | null
  unreadCount: number
}

type ExpandedConversation = ConversationsResponse<{
  memberships_via_conversation: ExpandedMembership[]
}>

type PreviewTask = {
  conversation: Conversation
  viewerMembership: ExpandedMembership | null
}

const PREVIEW_QUEUE_BATCH_SIZE = 10
const MAX_PREVIEW_BATCH_SIZE = 200
const AVATAR_PREFETCH_LIMIT = 20
const CACHE_PERSIST_DEBOUNCE_MS = 250

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
    setLoadMoreConversationsHandler,
  } = useAppStore()

  useEffect(() => {
    bootStep('messages.init.mounted')
  }, [])

  const cancelledRef = useRef(false)
  const prefetchedAvatarUrlsRef = useRef<Set<string>>(new Set())
  const aggregatedConversationsRef = useRef<ExpandedConversation[]>([])
  const aggregatedMembershipsRef = useRef<ExpandedMembership[]>([])
  const aggregatedPreviewMapRef = useRef<Map<string, ConversationPreviewCacheEntry>>(new Map())
  const previewQueueRef = useRef<PreviewTask[]>([])
  const loadNextPageRef = useRef<() => Promise<void>>(async () => {})
  const previewProcessingRef = useRef(false)
  const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const nextPageRef = useRef<number | null>(null)
  const totalPagesRef = useRef<number | null>(null)
  const isFetchingNextPageRef = useRef(false)

  const prefetchAvatarSignedUrls = useCallback(
    (memberships: ExpandedMembership[], limit?: number) => {
      if (!memberships.length) return

      const scale = PixelRatio.get()
      const avatarDimension = Math.round(((s.$5 as number) || 52) * scale)
      const maxCount = typeof limit === 'number' ? Math.max(limit, 0) : Number.POSITIVE_INFINITY

      let processed = 0
      const requests: Promise<unknown>[] = []

      for (const membership of memberships) {
        if (processed >= maxCount) break
        const image = membership.expand?.user?.image
        if (!image) continue

        const optimizedUrl = constructPinataUrl(image, {
          width: avatarDimension,
          height: avatarDimension,
        })

        if (!optimizedUrl || prefetchedAvatarUrlsRef.current.has(optimizedUrl)) continue

        prefetchedAvatarUrlsRef.current.add(optimizedUrl)
        processed += 1
        requests.push(
          getSignedUrl(optimizedUrl).catch((error) => {
            prefetchedAvatarUrlsRef.current.delete(optimizedUrl)
            console.warn('prefetchAvatarSignedUrls failed', { optimizedUrl, error })
          })
        )
      }

      if (requests.length) {
        Promise.allSettled(requests).catch(() => {})
      }
    },
    [getSignedUrl]
  )

  const schedulePersist = useCallback(() => {
    if (!user?.id) return
    if (persistTimeoutRef.current) return

    persistTimeoutRef.current = setTimeout(() => {
      persistTimeoutRef.current = null
      const userId = user.id
      const previewList: ConversationPreviewCacheEntry[] = []

      aggregatedConversationsRef.current.forEach((conversation) => {
        const preview = aggregatedPreviewMapRef.current.get(conversation.id)
        if (preview) {
          previewList.push(preview)
        }
      })

      void simpleCache.set('conversations', aggregatedConversationsRef.current, userId)
      void simpleCache.set('conversation_memberships', aggregatedMembershipsRef.current, userId)
      if (previewList.length) {
        void simpleCache.set('conversation_previews', previewList, userId)
      }
    }, CACHE_PERSIST_DEBOUNCE_MS)
  }, [user?.id])

  const computeUnreadCount = useCallback(
    (
      viewerMembership: ExpandedMembership | null,
      latestMessage: Message | null,
      viewerId?: string,
      fallback?: number
    ) => {
      if (!viewerMembership || !latestMessage || !viewerId) {
        return typeof fallback === 'number' ? fallback : 0
      }

      if (latestMessage.sender === viewerId) {
        return 0
      }

      const latestCreated = latestMessage.created ? Date.parse(latestMessage.created) : NaN
      if (Number.isNaN(latestCreated)) {
        return typeof fallback === 'number' ? fallback : 0
      }

      const lastRead = viewerMembership.last_read ? Date.parse(viewerMembership.last_read) : NaN
      if (Number.isNaN(lastRead)) {
        return 1
      }

      return latestCreated > lastRead ? 1 : 0
    },
    []
  )

  type ConversationPreviewRow = {
    id: string
    user_id: string
    conversation_id: string
    latest_message_id: string | null
    latest_message_text: string | null
    latest_message_created: string | null
    latest_message_sender: string | null
    latest_message_image: string | null
    unread_count: number | null
  }

  const fetchConversationPreviewsFromView = useCallback(
    async (conversationIds: string[]) => {
      if (!user?.id || !conversationIds.length) return null

      const filterParts = conversationIds.map((id) => `conversation_id = "${id}"`)
      const filterClause = filterParts.length ? `(${filterParts.join(' || ')})` : ''
      const filter = filterClause
        ? `user_id = "${user.id}" && ${filterClause}`
        : `user_id = "${user.id}"`

      try {
        const rows = await pocketbase
          .collection('conversation_previews')
          .getFullList<ConversationPreviewRow>({
            filter,
            batch: MAX_PREVIEW_BATCH_SIZE,
          })

        const map = new Map<string, ConversationPreviewRow>()
        rows.forEach((row) => {
          map.set(row.conversation_id, row)
        })
        return map
      } catch (error) {
        console.warn('fetchConversationPreviewsFromView failed', error)
        return null
      }
    },
    [user?.id]
  )

  const fetchConversationPreviewBatch = useCallback(
    async (tasks: PreviewTask[]) => {
      if (!tasks.length) return

      const conversationIds = tasks.map((task) => task.conversation.id)
      const filter = conversationIds.map((id) => `(conversation = "${id}")`).join(' || ')
      const latestByConversation = new Map<string, Message>()

      if (filter) {
        const perPage = Math.min(Math.max(conversationIds.length * 4, conversationIds.length), 200)
        try {
          const response = await pocketbase.collection('messages').getList<Message>(1, perPage, {
            filter,
            sort: '-created',
          })

          for (const item of response.items) {
            if (!item.conversation) continue
            if (!latestByConversation.has(item.conversation)) {
              latestByConversation.set(item.conversation, item)
            }
            if (latestByConversation.size === conversationIds.length) {
              break
            }
          }
        } catch (error) {
          console.warn('Failed to build conversation previews batch', { error, conversationIds })
        }
      }

      if (cancelledRef.current) return

      tasks.forEach((task) => {
        const conversationId = task.conversation.id
        const latest = latestByConversation.get(conversationId) ?? null
        const existing = aggregatedPreviewMapRef.current.get(conversationId)
        const message = latest ?? existing?.message ?? null
        const unreadCount = computeUnreadCount(
          task.viewerMembership,
          message,
          user?.id,
          existing?.unreadCount
        )

        aggregatedPreviewMapRef.current.set(conversationId, {
          conversationId,
          message,
          unreadCount,
        })
        setConversationPreview(conversationId, message, unreadCount)
      })
    },
    [computeUnreadCount, setConversationPreview, user?.id]
  )

  const processPreviewQueue = useCallback(() => {
    if (cancelledRef.current) {
      previewQueueRef.current = []
      previewProcessingRef.current = false
      return
    }

    const batch = previewQueueRef.current.splice(0, PREVIEW_QUEUE_BATCH_SIZE)
    if (!batch.length) {
      previewProcessingRef.current = false
      schedulePersist()
      return
    }

    fetchConversationPreviewBatch(batch)
      .catch((error) => {
        console.error('Preview queue failed', error)
      })
      .finally(() => {
        if (cancelledRef.current) {
          previewQueueRef.current = []
          previewProcessingRef.current = false
          return
        }

        if (previewQueueRef.current.length) {
          processPreviewQueue()
        } else {
          previewProcessingRef.current = false
          schedulePersist()
        }
      })
  }, [fetchConversationPreviewBatch, schedulePersist])

  const enqueuePreviewTasks = useCallback(
    (tasks: PreviewTask[]) => {
      if (!tasks.length) return
      previewQueueRef.current.push(...tasks)
      if (previewProcessingRef.current) return
      previewProcessingRef.current = true
      processPreviewQueue()
    },
    [processPreviewQueue]
  )

  const clearPreviewQueue = useCallback(() => {
    previewQueueRef.current = []
    previewProcessingRef.current = false
  }, [])

  const applyPreviewSnapshot = useCallback(
    (conversationId: string) => {
      const preview = aggregatedPreviewMapRef.current.get(conversationId)
      setConversationPreview(conversationId, preview?.message ?? null, preview?.unreadCount ?? 0)
    },
    [setConversationPreview]
  )

  const hydrateFromCache = useCallback(async () => {
    if (!user?.id) return
    bootStep('messages.cache.hydrate.start')
    try {
      const [cachedConversations, cachedMemberships, cachedPreviews] = await Promise.all([
        simpleCache.get<ExpandedConversation[]>('conversations', user.id),
        simpleCache.get<ExpandedMembership[]>('conversation_memberships', user.id),
        simpleCache.get<ConversationPreviewCacheEntry[]>('conversation_previews', user.id),
      ])

      if (cancelledRef.current) return

      aggregatedConversationsRef.current = cachedConversations ? [...cachedConversations] : []
      aggregatedMembershipsRef.current = cachedMemberships ? [...cachedMemberships] : []

      if (cachedConversations) {
        setConversations(cachedConversations as unknown as Conversation[])
      }
      if (cachedMemberships) {
        setMemberships(cachedMemberships)
      }

      aggregatedPreviewMapRef.current = new Map()
      if (cachedPreviews && cachedPreviews.length) {
        cachedPreviews.forEach((preview) => {
          aggregatedPreviewMapRef.current.set(preview.conversationId, {
            conversationId: preview.conversationId,
            message: preview.message,
            unreadCount: preview.unreadCount ?? 0,
          })
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
    } finally {
      bootStep('messages.cache.hydrate.end')
    }
  }, [setConversationPreviews, setConversations, setMemberships, user?.id])



  const loadNextPage = useCallback(async (): Promise<void> => {
    if (!user?.id) return
    if (isFetchingNextPageRef.current) return
    const nextPage = nextPageRef.current
    const totalPages = totalPagesRef.current
    if (!nextPage || !totalPages || nextPage > totalPages) {
      setLoadMoreConversationsHandler(null)
      return
    }

    isFetchingNextPageRef.current = true
    try {
      const res = await pocketbase.collection('conversations').getList<ExpandedConversation>(nextPage, PAGE_SIZE, {
        sort: '-created',
        expand: 'memberships_via_conversation.user',
      })

      if (cancelledRef.current) return

      const pageItems = res.items || []
      totalPagesRef.current = res.totalPages ?? totalPages
      const computedNextPage = res.page + 1
      nextPageRef.current =
        totalPagesRef.current && computedNextPage <= totalPagesRef.current ? computedNextPage : null

      if (!pageItems.length) {
        setLoadMoreConversationsHandler(nextPageRef.current ? loadNextPageRef.current : null)
        schedulePersist()
        return
      }

      const previewTasks: PreviewTask[] = []

      pageItems.forEach((conversation) => {
        aggregatedConversationsRef.current.push(conversation)
        addConversation(conversation as unknown as Conversation)

        const membershipList = (conversation.expand?.memberships_via_conversation || []).map((membership) => ({
          ...membership,
          conversation: membership.conversation ?? conversation.id,
        })) as ExpandedMembership[]

        if (membershipList.length) {
          aggregatedMembershipsRef.current.push(...membershipList)
          prefetchAvatarSignedUrls(membershipList, AVATAR_PREFETCH_LIMIT)
          membershipList.forEach((membership) => {
            try {
              addMembership(membership)
            } catch (error) {
              console.error('error adding membership', error)
            }
          })
        }

        const viewerMembership =
          membershipList.find((membership) => membership.expand?.user?.id === user.id) ?? null

        const existing = aggregatedPreviewMapRef.current.get(conversation.id)
        if (!existing) {
          aggregatedPreviewMapRef.current.set(conversation.id, {
            conversationId: conversation.id,
            message: null,
            unreadCount: 0,
          })
          setConversationPreview(conversation.id, null, 0)
        }

        if (viewerMembership && !existing?.message) {
          previewTasks.push({
            conversation: conversation as unknown as Conversation,
            viewerMembership,
          })
        }
      })

      if (previewTasks.length) {
        enqueuePreviewTasks(previewTasks)
      }

      schedulePersist()
      setLoadMoreConversationsHandler(nextPageRef.current ? loadNextPageRef.current : null)
    } catch (error) {
      console.error('Failed to load additional conversations', error)
    } finally {
      isFetchingNextPageRef.current = false
    }
  }, [
    addConversation,
    addMembership,
    enqueuePreviewTasks,
    prefetchAvatarSignedUrls,
    schedulePersist,
    setConversationPreview,
    setLoadMoreConversationsHandler,
    user?.id,
  ])

  useEffect(() => {
    loadNextPageRef.current = loadNextPage
  }, [loadNextPage])

  const fetchInitialData = useCallback(async () => {
    try {
      bootStep('messages.fetchInitial.start')
      const firstPage = await pocketbase
        .collection('conversations')
        .getList<ExpandedConversation>(1, PAGE_SIZE, {
          sort: '-created',
          expand: 'memberships_via_conversation.user',
        })
      bootStep('messages.fetchInitial.received')

      const firstPageConversations = firstPage.items || []

      aggregatedConversationsRef.current = [...firstPageConversations]
      setConversations(firstPageConversations as unknown as Conversation[])

      const membershipsByConversation = new Map<string, ExpandedMembership[]>()
      const flattenedMemberships: ExpandedMembership[] = []

      firstPageConversations.forEach((conversation) => {
        const membershipList = (conversation.expand?.memberships_via_conversation || []).map((membership) => ({
          ...membership,
          conversation: membership.conversation ?? conversation.id,
        })) as ExpandedMembership[]
        membershipsByConversation.set(conversation.id, membershipList)
        flattenedMemberships.push(...membershipList)
      })

      aggregatedMembershipsRef.current = [...flattenedMemberships]

      if (flattenedMemberships.length) {
        setMemberships(flattenedMemberships)
        prefetchAvatarSignedUrls(flattenedMemberships, AVATAR_PREFETCH_LIMIT)
      }

      const conversationIds = firstPageConversations.map((conversation) => conversation.id)
      const previewRowsPromise = fetchConversationPreviewsFromView(conversationIds)

      const initialPreviews = firstPageConversations.map((conversation) => {
        const existing = aggregatedPreviewMapRef.current.get(conversation.id)
        if (!existing) {
          aggregatedPreviewMapRef.current.set(conversation.id, {
            conversationId: conversation.id,
            message: null,
            unreadCount: 0,
          })
        }

        return {
          conversationId: conversation.id,
          message: existing?.message ?? null,
          unreadCount: existing?.unreadCount ?? 0,
        }
      })

      if (initialPreviews.length) {
        setConversationPreviews(initialPreviews)
      }

      previewRowsPromise
        .then((previewMap) => {
          if (cancelledRef.current) return

          if (!previewMap || previewMap.size === 0) {
            const fallbackTasks: PreviewTask[] = []
            firstPageConversations.forEach((conversation) => {
              const membershipList = membershipsByConversation.get(conversation.id) || []
              const viewerMembership =
                membershipList.find((membership) => membership.expand?.user?.id === user?.id) ?? null
              const existing = aggregatedPreviewMapRef.current.get(conversation.id)
              if (viewerMembership && !existing?.message) {
                fallbackTasks.push({
                  conversation: conversation as unknown as Conversation,
                  viewerMembership,
                })
              }
            })

            if (fallbackTasks.length) {
              enqueuePreviewTasks(fallbackTasks)
            }
            return
          }

          const updates: Array<{ conversationId: string; message: Message | null; unreadCount: number }> = []
          const fallbackTasks: PreviewTask[] = []

          firstPageConversations.forEach((conversation) => {
            const membershipList = membershipsByConversation.get(conversation.id) || []
            const viewerMembership =
              membershipList.find((membership) => membership.expand?.user?.id === user?.id) ?? null

            const row = previewMap.get(conversation.id) ?? null
            const existing = aggregatedPreviewMapRef.current.get(conversation.id)

            if (row?.latest_message_id) {
              const latest: Message = {
                id: row.latest_message_id,
                conversation: conversation.id,
                text: row.latest_message_text ?? undefined,
                created: row.latest_message_created ?? undefined,
                sender: row.latest_message_sender ?? '',
                image: row.latest_message_image ?? undefined,
              }
              const unread =
                typeof row.unread_count === 'number'
                  ? row.unread_count
                  : computeUnreadCount(viewerMembership, latest, user?.id, existing?.unreadCount)
              const sameMessage = existing?.message?.id === latest.id
              const sameUnread = existing?.unreadCount === unread

              if (!sameMessage || !sameUnread) {
                aggregatedPreviewMapRef.current.set(conversation.id, {
                  conversationId: conversation.id,
                  message: latest,
                  unreadCount: unread,
                })
                updates.push({
                  conversationId: conversation.id,
                  message: latest,
                  unreadCount: unread,
                })
              }
            } else if (viewerMembership && !existing?.message) {
              fallbackTasks.push({
                conversation: conversation as unknown as Conversation,
                viewerMembership,
              })
            }
          })

          if (updates.length) {
            setConversationPreviews(updates)
          }

          if (fallbackTasks.length) {
            enqueuePreviewTasks(fallbackTasks)
          }
        })
        .catch((error) => {
          console.warn('Initial preview view fetch failed', error)

          const fallbackTasks: PreviewTask[] = []
          firstPageConversations.forEach((conversation) => {
            const membershipList = membershipsByConversation.get(conversation.id) || []
            const viewerMembership =
              membershipList.find((membership) => membership.expand?.user?.id === user?.id) ?? null

            const existing = aggregatedPreviewMapRef.current.get(conversation.id)
            if (viewerMembership && !existing?.message) {
              fallbackTasks.push({
                conversation: conversation as unknown as Conversation,
                viewerMembership,
              })
            }
          })

          if (fallbackTasks.length) {
            enqueuePreviewTasks(fallbackTasks)
          }
        })

      totalPagesRef.current = firstPage.totalPages ?? firstPage.page ?? 1
      const computedNextPage = firstPage.page + 1
      nextPageRef.current =
        totalPagesRef.current && computedNextPage <= totalPagesRef.current ? computedNextPage : null

      schedulePersist()
      setLoadMoreConversationsHandler(nextPageRef.current ? loadNextPageRef.current : null)

      InteractionManager.runAfterInteractions(() => {
        if (cancelledRef.current) return
        Promise.allSettled([
          pocketbase.collection('reactions').getFullList<ExpandedReaction>({ expand: 'user' }),
          pocketbase.collection('saves').getFullList<ExpandedSave>({ expand: 'user' }),
        ])
          .then((results) => {
            if (cancelledRef.current) return
            const [reactionsRes, savesRes] = results
            if (reactionsRes.status === 'fulfilled' && reactionsRes.value.length) {
              setReactions(reactionsRes.value)
            }
            if (savesRes.status === 'fulfilled' && savesRes.value.length) {
              setSaves(savesRes.value)
            }
          })
          .catch((error) => {
            console.error('Failed to load secondary messaging data', error)
          })
      })
      bootStep('messages.fetchInitial.processed')
    } catch (error) {
      console.error('Failed to load messaging data', error)
      setLoadMoreConversationsHandler(loadNextPageRef.current)
    }
  }, [
    computeUnreadCount,
    enqueuePreviewTasks,
    fetchConversationPreviewsFromView,
    prefetchAvatarSignedUrls,
    schedulePersist,
    setConversationPreviews,
    setConversations,
    setLoadMoreConversationsHandler,
    setMemberships,
    setReactions,
    setSaves,
    user?.id,
  ])



  useEffect(() => {
    if (!user?.id) {
      aggregatedConversationsRef.current = []
      aggregatedMembershipsRef.current = []
      aggregatedPreviewMapRef.current = new Map()
      nextPageRef.current = null
      totalPagesRef.current = null
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current)
        persistTimeoutRef.current = null
      }
      clearPreviewQueue()
      setLoadMoreConversationsHandler(null)
      return
    }

    cancelledRef.current = false
    aggregatedConversationsRef.current = []
    aggregatedMembershipsRef.current = []
    aggregatedPreviewMapRef.current = new Map()
    nextPageRef.current = null
    totalPagesRef.current = null
    clearPreviewQueue()

    const hydrateThenFetch = async () => {
      try {
        await hydrateFromCache()
      } catch (error) {
        console.error('Messaging cache hydration failed', error)
      }

      if (cancelledRef.current) return

      fetchInitialData().catch((error) => {
        console.error('Messaging initialisation failed', error)
      })
    }

    hydrateThenFetch().catch((error) => {
      console.error('Messaging bootstrap failed', error)
    })

    return () => {
      cancelledRef.current = true
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current)
        persistTimeoutRef.current = null
      }
      clearPreviewQueue()
      setLoadMoreConversationsHandler(null)
    }
  }, [
    clearPreviewQueue,
    fetchInitialData,
    hydrateFromCache,
    setLoadMoreConversationsHandler,
    user?.id,
  ])

  useEffect(() => {
    if (!user) return
    try {
      pocketbase.collection('messages').subscribe<Message>('*', async (event) => {
        if (event.action === 'create') {
          addNewMessage(event.record.conversation!, event.record)

          if (event.record.sender !== user.id) {
            let senderName: string | null = null
            const membership = aggregatedMembershipsRef.current.find(
              (member) => member.expand?.user?.id === event.record.sender
            )
            if (membership?.expand?.user) {
              const profile = membership.expand.user
              senderName = profile.firstName || profile.name || null
            }

            const content = senderName
              ? `${senderName} messaged you!`
              : 'You have a new message!'

            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: 'New message',
                  body: content,
                },
                trigger: null,
              })
            } catch (error) {
              console.warn('Failed to schedule message notification', error)
            }
          }
        }
      })
    } catch (error) {
      console.error(error)
    }

    return () => {
      pocketbase.collection('messages').unsubscribe('*')
    }
  }, [user?.id, addNewMessage])

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

  useEffect(() => {
    if (!user) return

    try {
      pocketbase.collection('memberships').subscribe('*', async (event) => {
        if (event.action === 'update') {
          const expandedMembership = await pocketbase
            .collection('memberships')
            .getOne<ExpandedMembership>(event.record.id, { expand: 'user' })
          updateMembership(expandedMembership)

          if (expandedMembership.expand?.user?.id === user.id) {
            setConversationUnreadCount(expandedMembership.conversation, 0)
            const existingPreview = aggregatedPreviewMapRef.current.get(expandedMembership.conversation)
            if (existingPreview) {
              aggregatedPreviewMapRef.current.set(expandedMembership.conversation, {
                ...existingPreview,
                unreadCount: 0,
              })
              applyPreviewSnapshot(expandedMembership.conversation)
              schedulePersist()
            }
          }
        }

        if (event.action === 'create') {
          const expandedMembership = await pocketbase
            .collection('memberships')
            .getOne<ExpandedMembership>(event.record.id, { expand: 'user' })
          try {
            addMembership(expandedMembership)
            aggregatedMembershipsRef.current.push({
              ...expandedMembership,
              conversation: expandedMembership.conversation ?? expandedMembership.conversation,
            })
          } catch (error) {
            console.error('error adding membership', error)
          }

          if (event.record.user === user.id) {
            const conversation = await pocketbase
              .collection('conversations')
              .getOne<ExpandedConversation>(event.record.conversation, {
                expand: 'memberships_via_conversation.user',
              })
            aggregatedConversationsRef.current.push(conversation)
            addConversation(conversation as unknown as Conversation)

            const membershipList =
              conversation.expand?.memberships_via_conversation || ([] as ExpandedMembership[])
            const normalizedMemberships = membershipList.map((membership) => ({
              ...membership,
              conversation: membership.conversation ?? conversation.id,
            })) as ExpandedMembership[]

            if (normalizedMemberships.length) {
              aggregatedMembershipsRef.current.push(...normalizedMemberships)
              prefetchAvatarSignedUrls(normalizedMemberships, AVATAR_PREFETCH_LIMIT)
              normalizedMemberships.forEach((membership) => {
                try {
                  addMembership(membership)
                } catch (error) {
                  console.error('error adding membership', error)
                }
              })
            }

            const viewerMembership = normalizedMemberships.find(
              (membership) => membership.expand?.user?.id === user.id
            ) ?? null

            const existing = aggregatedPreviewMapRef.current.get(conversation.id)
            if (!existing) {
              aggregatedPreviewMapRef.current.set(conversation.id, {
                conversationId: conversation.id,
                message: null,
                unreadCount: 0,
              })
            }

            applyPreviewSnapshot(conversation.id)

            if (viewerMembership) {
              enqueuePreviewTasks([
                {
                  conversation: conversation as unknown as Conversation,
                  viewerMembership,
                },
              ])
            }

            schedulePersist()
          }
        }
      })
    } catch (error) {
      console.error(error)
    }
    return () => {
      pocketbase.collection('memberships').unsubscribe('*')
    }
  }, [
    addConversation,
    addMembership,
    applyPreviewSnapshot,
    enqueuePreviewTasks,
    prefetchAvatarSignedUrls,
    schedulePersist,
    setConversationUnreadCount,
    updateMembership,
    user?.id,
  ])

  return null
}
