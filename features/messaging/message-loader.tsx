import { useEffect } from 'react'

import { queryClient } from '@/core/queryClient'
import { pocketbase } from '@/features/pocketbase'
import { useAppStore } from '@/features/stores'
import type { Message, Reaction } from '@/features/types'
import { messagingKeys } from '@/features/queries/messaging'
import { useConversationPreviews } from '@/features/messaging/useConversationPreviews'

export function MessagesInit() {
  const { user } = useAppStore()

  useConversationPreviews()

  useEffect(() => {
    if (!user?.id) return

    const startedAt = Date.now()
    console.log('[boot-trace] messaging.reactions:start')
    const subscription = pocketbase.collection('reactions').subscribe<Reaction>('*', async (event) => {
      if (!event.record?.message) return
      if (event.action !== 'create' && event.action !== 'delete') return

      try {
        const message = await pocketbase.collection('messages').getOne<Message>(event.record.message)
        const conversationId = message.conversation
        if (conversationId) {
          queryClient.invalidateQueries({ queryKey: messagingKeys.messages(conversationId) })
          queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(user.id) })
        }
      } catch (error) {
        console.error('Failed to hydrate reaction message', error)
      }
    })

    subscription
      .then((unsubscribe) => {
        console.log('[boot-trace] messaging.reactions:established', Date.now() - startedAt, 'ms')
        return unsubscribe
      })
      .catch((error) => {
        console.warn('[boot-trace] messaging.reactions:failed', error)
      })

    return () => {
      subscription
        .then((unsubscribe) => unsubscribe?.())
        .catch(() => {})
      console.log('[boot-trace] messaging.reactions:cleanup', Date.now() - startedAt, 'ms')
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return

    const startedAt = Date.now()
    console.log('[boot-trace] messaging.memberships:start')
    const subscription = pocketbase.collection('memberships').subscribe('*', async (event) => {
      if (event.action === 'create') {
        try {
          queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(user.id) })
        } catch (error) {
          console.error('Failed to hydrate membership', error)
        }
      }

      if (event.action === 'update') {
        queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(user.id) })
      }
    })

    subscription
      .then(() => {
        console.log('[boot-trace] messaging.memberships:established', Date.now() - startedAt, 'ms')
      })
      .catch((error) => {
        console.warn('[boot-trace] messaging.memberships:failed', error)
      })

    return () => {
      subscription
        .then((unsubscribe) => unsubscribe?.())
        .catch(() => {})
      console.log('[boot-trace] messaging.memberships:cleanup', Date.now() - startedAt, 'ms')
    }
  }, [user?.id])

  return null
}
