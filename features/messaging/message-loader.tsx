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
} from '@/features/pocketbase/types'
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

  // load conversations
  useEffect(() => {
    const getConversations = async () => {
      const conversations = await pocketbase.collection('conversations').getFullList<Conversation>({
        sort: '-created',
      })
      setConversations(conversations)
      for (const conversation of conversations) {
        await loadInitialMessages(conversation)
      }
    }
    try {
      getConversations()
    } catch (error) {
      console.error(error)
    }
  }, [user])

  //load reactions
  useEffect(() => {
    const getReactions = async () => {
      const reactions = await pocketbase.collection('reactions').getFullList<ExpandedReaction>({
        expand: 'user',
      })
      setReactions(reactions)
    }
    try {
      getReactions()
    } catch (error) {
      console.error(error)
    }
  }, [user])

  // load saves
  useEffect(() => {
    const getSaves = async () => {
      const saves = await pocketbase.collection('saves').getFullList<ExpandedSave>({
        expand: 'user',
      })
      setSaves(saves)
    }
    try {
      getSaves()
    } catch (error) {
      console.error(error)
    }
  }, [user])

  // load memberships
  useEffect(() => {
    const getMemberships = async () => {
      const memberships = await pocketbase
        .collection('memberships')
        .getFullList<ExpandedMembership>({
          expand: 'user',
        })
      setMemberships(memberships)
    }
    try {
      getMemberships()
    } catch (error) {
      console.error(error)
    }
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
