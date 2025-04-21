import { useEffect } from 'react'
import { pocketbase, useUserStore } from '../pocketbase'
import { useMessageStore } from '../pocketbase/stores/messages'
import { Conversation, ExpandedMembership, Message } from '../pocketbase/stores/types'

export function MessagesInit() {
  const { user } = useUserStore()
  const { setConversations, updateConversation } = useMessageStore();
  const { setMessages, addMessage, addConversation } = useMessageStore();
  const { setMemberships } = useMessageStore();

  // load conversations
  useEffect(() => {
    const getConversations = async () => {
      const conversations = await pocketbase.collection('conversations').getFullList<Conversation>({
        sort: '-created',
      })
      setConversations(conversations);
    }
    try {
      getConversations();
    }
    catch (error) {
      console.error(error)
    }

  }, [user])

  // load messages
  useEffect(() => {
    const getMessages = async () => {
      const messages = await pocketbase.collection('messages').getFullList<Message>({
        sort: 'created',
      })
      setMessages(messages);
    }
    try {
      getMessages();
    }
    catch (error) {
      console.error(error)
    }

  }, [user])

  // load memberships
  useEffect(() => {
    const getMemberships = async () => {
      const memberships = await pocketbase.collection('memberships').getFullList<ExpandedMembership>({
        expand: 'user',
      });
      setMemberships(memberships);
    }
    try {
      getMemberships();
    }
    catch (error) {
      console.error(error)
    }

  }, [user])

  // subscribe to new messages
  useEffect(() => {
    pocketbase.collection('messages').subscribe('*', (e) => {
      if (e.action === 'create') {
        addMessage(e.record);
      }
    })

    return () => {
      console.log('unsubscribe')
      pocketbase.collection('messages').unsubscribe('*')
    }
  }, [user])

  // subscribe to conversation updates 
  useEffect(() => {
    pocketbase.collection('conversations').subscribe('*', (e) => {   
      if (e.action === 'update') {
        updateConversation(e.record);
      }
      if (e.action === 'create') {
        addConversation(e.record);
      }
    })

    return () => {
      console.log('unsubscribe')
      pocketbase.collection('conversations').unsubscribe('*')
    }
  }, [user])

  return <></>

}

