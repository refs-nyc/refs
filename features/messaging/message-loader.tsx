import { useEffect } from 'react'
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
  Save,
} from '@/features/types'
import { ConversationsRecord } from '@/features/pocketbase/pocketbase-types'

export function MessagesInit() {
  const {
    user,
    setMessagesForConversation,
    setOldestLoadedMessageDate,
    addNewMessage,
    setFirstMessageDate,
    setConversations,
    setReactions,
    addConversation,
    addMembership,
    addReaction,
    removeReaction,
    setMemberships,
    updateMembership,
    setSaves,
  } = useAppStore()

  // load conversations - make non-blocking
  useEffect(() => {
    if (!user) return

    const getConversations = async () => {
      try {
        const conversations = await pocketbase
          .collection('conversations')
          .getFullList<Conversation>({
            sort: '-created',
          })
        setConversations(conversations)

        // Load messages in batches to avoid overwhelming the system
        const batchSize = 5 // Increased batch size for better performance
        for (let i = 0; i < conversations.length; i += batchSize) {
          const batch = conversations.slice(i, i + batchSize)
          setTimeout(() => {
            batch.forEach((conversation) => {
              loadInitialMessages(conversation).catch((error) => {
                console.error('Failed to load messages for conversation:', conversation.id, error)
              })
            })
          }, i * 50) // Reduced delay from 100ms to 50ms
        }
      } catch (error) {
        console.error('Failed to load conversations:', error)
      }
    }

    // Use setTimeout to make it non-blocking
    setTimeout(() => {
      getConversations()
    }, 0)
  }, [user])

  //load reactions - make non-blocking
  useEffect(() => {
    if (!user) return

    const getReactions = async () => {
      try {
        const reactions = await pocketbase.collection('reactions').getFullList<ExpandedReaction>({
          expand: 'user',
        })
        setReactions(reactions)
      } catch (error) {
        console.error('Failed to load reactions:', error)
      }
    }

    // Reduced delay from 100ms to 10ms
    setTimeout(() => {
      getReactions()
    }, 10)
  }, [user])

  // load saves - make non-blocking
  useEffect(() => {
    if (!user) return

    const getSaves = async () => {
      try {
        const saves = await pocketbase.collection('saves').getFullList<ExpandedSave>({
          expand: 'user',
        })
        setSaves(saves)
      } catch (error) {
        console.error('Failed to load saves:', error)
      }
    }

    // Reduced delay from 200ms to 20ms
    setTimeout(() => {
      getSaves()
    }, 20)
  }, [user])

  // load memberships - make non-blocking
  useEffect(() => {
    if (!user) return

    const getMemberships = async () => {
      try {
        const memberships = await pocketbase
          .collection('memberships')
          .getFullList<ExpandedMembership>({
            expand: 'user',
          })
        setMemberships(memberships)
      } catch (error) {
        console.error('Failed to load memberships:', error)
      }
    }

    // Reduced delay from 300ms to 30ms
    setTimeout(() => {
      getMemberships()
    }, 30)
  }, [user])

  // subscribe to new messages
  useEffect(() => {
    if (!user) return
    try {
      pocketbase.collection('messages').subscribe<Message>('*', (e) => {
        if (e.action === 'create') {
          addNewMessage(e.record.conversation!, e.record)
        }
      })
    } catch (error) {
      console.error(error)
    }

    return () => {
      pocketbase.collection('messages').unsubscribe('*')
    }
  }, [user])

  // subscribe to reactions
  useEffect(() => {
    if (!user) return
    try {
      pocketbase.collection('reactions').subscribe<Reaction>('*', async (e) => {
        if (e.action === 'create') {
          const expandedReaction = await pocketbase
            .collection('reactions')
            .getOne<ExpandedReaction>(e.record.id, { expand: 'user' })
          addReaction(expandedReaction)
        }
        if (e.action === 'delete') {
          removeReaction(e.record)
        }
      })
    } catch (error) {
      console.error(error)
    }

    return () => {
      pocketbase.collection('reactions').unsubscribe('*')
    }
  }, [user])

  //subscribe to membership updates (to see new conversations)
  useEffect(() => {
    if (!user) return
    try {
      pocketbase.collection('memberships').subscribe('*', async (e) => {
        if (e.action === 'update') {
          const expandedMembership = await pocketbase
            .collection('memberships')
            .getOne<ExpandedMembership>(e.record.id, { expand: 'user' })
          updateMembership(expandedMembership)
        }
        if (e.action === 'create') {
          const expandedMembership = await pocketbase
            .collection('memberships')
            .getOne<ExpandedMembership>(e.record.id, { expand: 'user' })
          try {
            addMembership(expandedMembership)
          } catch (error) {
            console.error('error adding membership')
            console.error(error)
          }
          if (e.record.user === user?.id) {
            const conversation = await pocketbase
              .collection('conversations')
              .getOne(e.record.conversation)
            await loadInitialMessages(conversation)
            addConversation(conversation)
          }
        }
      })
    } catch (error) {
      console.error(error)
    }
    return () => {
      pocketbase.collection('memberships').unsubscribe('*')
    }
  }, [user])

  return <></>

  async function loadInitialMessages(conversation: ConversationsRecord) {
    const messages = await pocketbase.collection('messages').getList<Message>(0, PAGE_SIZE, {
      filter: `conversation = "${conversation.id}"`,
      sort: '-created',
    })
    setMessagesForConversation(conversation.id, messages.items)
    if (messages.items.length) {
      const oldestMessage = messages.items[messages.items.length - 1]
      setOldestLoadedMessageDate(conversation.id, oldestMessage.created!)
    }

    const firstMessage = await pocketbase
      .collection('messages')
      .getFirstListItem<Message>(`conversation = "${conversation.id}"`, {
        sort: 'created',
      })
    setFirstMessageDate(conversation.id, firstMessage.created!)
  }
}
