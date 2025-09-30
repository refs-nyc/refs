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
    setBackgroundLoading,
    setConversationPreview,
    setConversationUnreadCount,
    getSignedUrl,
  } = useAppStore()

  const prefetchedAvatarUrlsRef = useRef<Set<string>>(new Set())

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
    if (!user) return

    let cancelled = false

    const hydrateFromCache = async () => {
      try {
        const [cachedConversations, cachedMemberships, cachedPreviews] = await Promise.all([
          simpleCache.get<ExpandedConversation[]>('conversations', user.id),
          simpleCache.get<ExpandedMembership[]>('conversation_memberships', user.id),
          simpleCache.get<ConversationPreviewCacheEntry[]>('conversation_previews', user.id),
        ])

        if (cancelled) return

          if (cachedConversations) {
            setConversations(cachedConversations as unknown as Conversation[])

            if (!cachedMemberships || cachedMemberships.length === 0) {
              const flattened = cachedConversations.flatMap((conversation) =>
                (conversation.expand?.memberships_via_conversation || []).map((membership) => ({
                  ...membership,
                  conversation: membership.conversation ?? conversation.id,
                }))
              )
              if (flattened.length) {
                setMemberships(flattened)
                prefetchAvatarSignedUrls(flattened)
              }
            }
          }
          if (cachedMemberships && cachedMemberships.length) {
            setMemberships(cachedMemberships)
            prefetchAvatarSignedUrls(cachedMemberships)
          }
        if (cachedPreviews) {
          cachedPreviews.forEach((preview) => {
            setConversationPreview(preview.conversationId, preview.message, preview.unreadCount ?? 0)
          })
        }
      } catch (error) {
        console.warn('Failed to hydrate messaging cache', error)
      }
    }

    const buildMembershipIndex = (memberships: ExpandedMembership[]) => {
      const map = new Map<string, ExpandedMembership>()
      memberships.forEach((membership) => {
        if (membership.expand?.user?.id === user.id) {
          map.set(membership.conversation, membership)
        }
      })
      return map
    }

    const fetchConversationPreviews = async (
      conversations: Conversation[],
      memberships: ExpandedMembership[]
    ): Promise<ConversationPreviewCacheEntry[]> => {
      const membershipIndex = buildMembershipIndex(memberships)
      const previews: ConversationPreviewCacheEntry[] = []
      const queue = [...conversations]
      const workerCount = Math.min(5, queue.length || 1)

      const workers = Array.from({ length: workerCount }).map(async () => {
        while (!cancelled) {
          const conversation = queue.shift()
          if (!conversation) break

          const preview = await fetchConversationPreview(conversation.id, membershipIndex)
          if (cancelled) break

          previews.push(preview)
          setConversationPreview(preview.conversationId, preview.message, preview.unreadCount)
        }
      })

      await Promise.all(workers)
      return previews
    }

    const fetchFreshData = async () => {
      try {
        const [conversationsRes, reactionsRes, savesRes] = await Promise.allSettled([
          pocketbase
            .collection('conversations')
            .getFullList<ExpandedConversation>({
              sort: '-created',
              expand: 'memberships_via_conversation.user',
            }),
          pocketbase.collection('reactions').getFullList<ExpandedReaction>({ expand: 'user' }),
          pocketbase.collection('saves').getFullList<ExpandedSave>({ expand: 'user' }),
        ])

        if (cancelled) return

        const conversations =
          conversationsRes.status === 'fulfilled' ? conversationsRes.value : ([] as ExpandedConversation[])
        const reactions =
          reactionsRes.status === 'fulfilled' ? reactionsRes.value : ([] as ExpandedReaction[])
        const saves = savesRes.status === 'fulfilled' ? savesRes.value : ([] as ExpandedSave[])

        if (conversations.length) {
          const flattenedMemberships = conversations.flatMap((conversation) =>
            (conversation.expand?.memberships_via_conversation || []).map((membership) => ({
              ...membership,
              conversation: membership.conversation ?? conversation.id,
            }))
          )

          if (flattenedMemberships.length) {
            setMemberships(flattenedMemberships)
            prefetchAvatarSignedUrls(flattenedMemberships)
            void simpleCache.set('conversation_memberships', flattenedMemberships, user.id)
          }

          setConversations(conversations as unknown as Conversation[])
          void simpleCache.set('conversations', conversations, user.id)
        }

        if (reactions.length) {
          setReactions(reactions)
        }
        if (saves.length) {
          setSaves(saves)
        }

        if (conversations.length) {
          const membershipsForPreview = conversations.flatMap(
            (conversation) => conversation.expand?.memberships_via_conversation || []
          ) as ExpandedMembership[]

          const previews = await fetchConversationPreviews(
            conversations as unknown as Conversation[],
            membershipsForPreview
          )
          if (!cancelled) {
            void simpleCache.set('conversation_previews', previews, user.id)
          }
        }
      } catch (error) {
        console.error('Failed to load messaging data', error)
      } finally {
        if (!cancelled) {
          setBackgroundLoading(false)
        }
      }
    }

    setBackgroundLoading(true)

    ;(async () => {
      await hydrateFromCache()
      if (!cancelled) {
        await fetchFreshData()
      }
    })().catch((error) => {
      console.error('Messaging initialisation failed', error)
      if (!cancelled) {
        setBackgroundLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [
    user?.id,
    setBackgroundLoading,
    setConversations,
    setMemberships,
    setReactions,
    setSaves,
    setConversationPreview,
    fetchConversationPreview,
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
