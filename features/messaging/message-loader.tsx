import { useEffect } from 'react'
import { pocketbase, useUserStore } from '../pocketbase'
import { useMessageStore } from '../pocketbase/stores/messages'
import { Conversation, ExpandedMembership, ExpandedReaction, Message, Reaction, Save } from '../pocketbase/stores/types'

export function MessagesInit() {
  const { user } = useUserStore()
  const { setConversations, setReactions } = useMessageStore();
  const { setMessages, addMessage, addConversation, addMembership, addReaction, removeReaction } = useMessageStore();
  const { setMemberships, updateMembership, setSaves } = useMessageStore();

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

  //load reactions
  useEffect(() => {
    const getReactions = async () => {
      const reactions = await pocketbase.collection('reactions').getFullList<ExpandedReaction>({
        expand: 'user',
      })
      setReactions(reactions);
    }
    try {
      getReactions();
    }
    catch (error) {
      console.error(error)
    }

  }, [user])

  // load saves
  useEffect(() => {
    const getSaves = async () => {
      const saves = await pocketbase.collection('saves').getFullList<Save>({
        expand: 'user',
      });
      setSaves(saves);
    }
    try {
      getSaves();
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

  // subscribe to reactions
  useEffect(() => {
    if (!user) return;
    try
    {
      console.log(`subscribing to new reactions, user: ${user?.userName}`)
      pocketbase.collection('reactions').subscribe<Reaction>('*', async (e) => {
        console.log(e)
        if (e.action === 'create') {
          console.log(`new reaction received: ${e.record.emoji}`)
          const expandedReaction = await pocketbase.collection('reactions').getOne<ExpandedReaction>(e.record.id, {expand: 'user'});
          addReaction(expandedReaction);
        }
        if (e.action === 'delete') {
          console.log(`reaction deleted: ${e.record.emoji}`)
          removeReaction(e.record);
        }
      })
    }
    catch (error) {
      console.error(error)
    }

    return () => {
      console.log('unsubscribe from reactions')
      pocketbase.collection('reactions').unsubscribe('*')
    }
  }, [user])

  //subscribe to membership updates (to see new conversations)
  useEffect(() => {
    if (!user) return;
    console.log(`subscribing to memberships, user: ${user?.userName}`)
    try 
    {
      pocketbase.collection('memberships').subscribe('*', async (e) => {   
        if (e.action === 'update') {
          console.log('membership updated')
          const expandedMembership = await pocketbase.collection('memberships').getOne<ExpandedMembership>(e.record.id, {expand: 'user'});
          updateMembership(expandedMembership);
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

