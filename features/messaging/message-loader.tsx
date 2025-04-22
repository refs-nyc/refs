import { useEffect } from 'react'
import { pocketbase, useUserStore } from '../pocketbase'
import { useMessageStore } from '../pocketbase/stores/messages'
import { Conversation, ExpandedMembership, Message } from '../pocketbase/stores/types'

export function MessagesInit() {
  const { user } = useUserStore()
  const { setConversations, updateConversation } = useMessageStore();
  const { setMessages, addMessage, addConversation, addMembership } = useMessageStore();
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
    if (!user) return;
    try
    {console.log(`subscribing to new messages, user: ${user?.userName}`)
    pocketbase.collection('messages').subscribe('*', (e) => {
      console.log(e)
      if (e.action === 'create') {
        console.log(`new message received: ${e.record.text}`)
        addMessage(e.record);
      }
    })}
    catch (error) {
      console.error(error)
    }

    return () => {
      console.log('unsubscribe from messages')
      pocketbase.collection('messages').unsubscribe('*')
    }
  }, [user])

  // subscribe to conversation updates 
  // useEffect(() => {
  //   console.log(`subscribing to conversations, user: ${user?.userName}`)
  //   pocketbase.collection('conversations').subscribe('*', (e) => {   
  //     if (e.action === 'update') {
  //       console.log('conversation updated')
  //       updateConversation(e.record);
  //     }
  //     if (e.action === 'create') {
  //       console.log('new conversation received')
  //       addConversation(e.record);
  //     }
  //   })

  //   return () => {
  //     console.log('unsubscribe')
  //     //pocketbase.collection('conversations').unsubscribe('*')
  //   }
  // }, [user])

  //subscribe to membership updates (to see new conversations)
  useEffect(() => {
    if (!user) return;
    console.log(`subscribing to memberships, user: ${user?.userName}`)
    try {
    pocketbase.collection('memberships').subscribe('*', async (e) => {   
      if (e.action === 'update') {
        console.log('membership updated')
      }
      if (e.action === 'create') {
        console.log(`new membership with user ${e.record.user} and conversation ${e.record.conversation}`)
        const expandedMembership = await pocketbase.collection('memberships').getOne<ExpandedMembership>(e.record.id, {expand: 'user'});
        console.log('user of expanded membership is',expandedMembership.expand?.user.email);
        try {
          addMembership(expandedMembership);
        }
        catch (error) {
          console.error('error adding membership');
          console.error(error);
        }
        console.log(`e.record.user is ${e.record.user}, user.id is ${user?.id}`)
        if (e.record.user === user?.id)
        {
          console.log(`adding new conversation with id ${e.record.conversation}`)
          const conversation = await pocketbase.collection('conversations').getOne(e.record.conversation);
          addConversation(conversation);
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

}

