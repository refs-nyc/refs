import { useEffect } from 'react'
import { pocketbase, useUserStore } from '../pocketbase'
import { PAGE_SIZE, useMessageStore } from '../pocketbase/stores/messages'
import {
  Conversation,
  ExpandedMembership,
  ExpandedReaction,
  ExpandedSave,
  Message,
  Reaction,
  Save,
} from '../pocketbase/stores/types'
import { ConversationsRecord } from '../pocketbase/stores/pocketbase-types'

export function MessagesInit() {
  const { user } = useUserStore()
  const {
    setMessagesForConversation,
    setOldestLoadedMessageDate,
    addNewMessage,
    setFirstMessageDate,
  } = useMessageStore()
  const { setConversations, setReactions } = useMessageStore()
  const { addConversation, addMembership, addReaction, removeReaction } = useMessageStore()
  const { setMemberships, updateMembership, setSaves } = useMessageStore()

  // load conversations
  useEffect(() => {
    const getConversations = async () => {
      const conversations = await pocketbase.collection('conversations').getFullList<Conversation>({
        sort: '-created',
      })
      console.log(
        'conversations',
        conversations.map((c) => c.id)
      )
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
      console.log(`subscribing to new messages, user: ${user?.userName}`)
      pocketbase.collection('messages').subscribe<Message>('*', (e) => {
        if (e.action === 'create') {
          console.log(`new message received: ${e.record.text}`)
          addNewMessage(e.record.conversation!, e.record)
        }
      })
    } catch (error) {
      console.error(error)
    }

    return () => {
      console.log('unsubscribe from messages')
      pocketbase.collection('messages').unsubscribe('*')
    }
  }, [user])

  // subscribe to reactions
  useEffect(() => {
    if (!user) return
    try {
      console.log(`subscribing to new reactions, user: ${user?.userName}`)
      pocketbase.collection('reactions').subscribe<Reaction>('*', async (e) => {
        if (e.action === 'create') {
          console.log(`new reaction received: ${e.record.emoji}`)
          const expandedReaction = await pocketbase
            .collection('reactions')
            .getOne<ExpandedReaction>(e.record.id, { expand: 'user' })
          addReaction(expandedReaction)
        }
        if (e.action === 'delete') {
          console.log(`reaction deleted: ${e.record.emoji}`)
          removeReaction(e.record)
        }
      })
    } catch (error) {
      console.error(error)
    }

    return () => {
      console.log('unsubscribe from reactions')
      pocketbase.collection('reactions').unsubscribe('*')
    }
  }, [user])

  //subscribe to membership updates (to see new conversations)
  useEffect(() => {
    if (!user) return
    console.log(`subscribing to memberships, user: ${user?.userName}`)
    try {
      pocketbase.collection('memberships').subscribe('*', async (e) => {
        if (e.action === 'update') {
          console.log('membership updated')
          const expandedMembership = await pocketbase
            .collection('memberships')
            .getOne<ExpandedMembership>(e.record.id, { expand: 'user' })
          updateMembership(expandedMembership)
        }
        if (e.action === 'create') {
          console.log(
            `new membership with user ${e.record.user} and conversation ${e.record.conversation}`
          )
          const expandedMembership = await pocketbase
            .collection('memberships')
            .getOne<ExpandedMembership>(e.record.id, { expand: 'user' })
          console.log('user of expanded membership is', expandedMembership.expand?.user.email)
          try {
            addMembership(expandedMembership)
          } catch (error) {
            console.error('error adding membership')
            console.error(error)
          }
          console.log(`e.record.user is ${e.record.user}, user.id is ${user?.id}`)
          if (e.record.user === user?.id) {
            console.log(`adding new conversation with id ${e.record.conversation}`)
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
      console.log('unsubscribe from memberships')
      pocketbase.collection('memberships').unsubscribe('*')
    }
  }, [user])

  return <></>

  async function loadInitialMessages(conversation: ConversationsRecord) {
    console.log('loading messages for conversation', conversation.id)
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
