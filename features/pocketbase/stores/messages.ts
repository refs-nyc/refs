import { create } from 'zustand';
import { Conversation, ExpandedMembership, ExpandedReaction, ExpandedSave, Message, Reaction, Save } from './types';
import { pocketbase } from '../pocketbase';

type MessageStore = {
  conversations: Record<string, Conversation>;
  setConversations: (conversations: Conversation[]) => void;
  updateConversation: (conversation: Conversation) => void;
  createConversation: (is_direct: boolean, creatorId: string, otherMemberIds: string[], title?: string) => Promise<string>;
  addConversation (conversation: Conversation): void;

  memberships: Record<string, ExpandedMembership[]>;
  setMemberships: (memberships: ExpandedMembership[]) => void;
  addMembership: (membership: ExpandedMembership) => void;
  updateMembership: (membership: ExpandedMembership) => void;
  createMemberships: (userIds: string[], conversationId: string) => Promise<void>;
  
  sendMessage: (sendreId: string, conversationId: string, text: string) => Promise<void>;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;

  reactions: Record<string, ExpandedReaction[]>;
  setReactions: (reactions: ExpandedReaction[]) => void;
  addReaction: (reaction: ExpandedReaction) => void;
  sendReaction: (senderId: string, messageId: string, emoji: string) => Promise<void>;
  deleteReaction: (id: string) => Promise<void>;
  removeReaction: (reaction: Reaction) => void;

  saves: ExpandedSave[];
  setSaves: (saves: ExpandedSave[]) => void;
  addSave: (userId: string, savedBy: string) => Promise<void>;
};

export const useMessageStore = create<MessageStore>((set) => ({
  conversations: {},
  setConversations: (items: Conversation[]) =>
  {
    const newItems: Record<string, Conversation> = {};
    items.forEach((item) => {
      newItems[item.id] = item;
    });

    set({ conversations: newItems });
  },
  updateConversation: (conversation) =>
  {
    set((state) => ({
      conversations: { ...state.conversations, [conversation.id]: conversation }
    }));
  },
  createConversation: async (is_direct: boolean, creatorId: string, otherMemberIds: string[], title?: string): Promise<string> =>
  {
    try
    {
      console.log(`creating conversation with ${otherMemberIds.length} users: ${otherMemberIds}`)
      const newConversation = await pocketbase.collection('conversations').create({
        is_direct, 
        title: is_direct ? undefined : (title || 'New Group Chat')
      });

      await pocketbase.collection('memberships').create({conversation: newConversation.id, user: creatorId});

      for (const userId of otherMemberIds) {
        await pocketbase.collection('memberships').create({conversation: newConversation.id, user: userId});
      }

      const newMemberships = await pocketbase.collection('memberships').getFullList<ExpandedMembership>({
        filter: `conversation = "${newConversation.id}"`,
        expand: 'user',
      });

      set((state) => ({
        conversations: { ...state.conversations, [newConversation.id]: newConversation },
        memberships : { ...state.memberships, [newConversation.id]: newMemberships }
      }));

      return newConversation.id;

    }
    catch (error)
    {
      console.error(error);
    }

  },
  addConversation: (conversation) =>
  {
    set((state) => ({
      conversations: { ...state.conversations, [conversation.id]: conversation }
    }));
  },
  memberships: {},
  addMembership: (membership) => {
    set((state) => {
      const prev = state.memberships[membership.conversation] || [];
      return {
        memberships: {
          ...state.memberships,
          [membership.conversation]: [...prev, membership],
        },
      };
    });
  },
  updateMembership: (membership) =>
  {
    set((state) => {
      const prev = state.memberships[membership.conversation] || [];
      return {
        memberships: {
          ...state.memberships,
          [membership.conversation]: prev.map(m=>m.id===membership.id ? membership : m),
        },
      };
    });
  },
  async createMemberships(userIds, conversationId) : Promise<void>
  {
    try
    {
      for (const userId of userIds) {
        await pocketbase.collection('memberships').create({conversation: conversationId, user: userId});
      }

      const newMemberships = await pocketbase.collection('memberships').getFullList<ExpandedMembership>({
        filter: `conversation = "${conversationId}"`,
        expand: 'user',
      });

      set((state) => ({
        memberships : { ...state.memberships, [conversationId]: newMemberships }
      }));
    }
    catch (error)
    {
      console.error(error);
    }
  },
  setMemberships: (memberships) =>
  {
    const newItems: Record<string, ExpandedMembership[]> = {};
    memberships.forEach((item) => {
      if (newItems[item.conversation]) {
        newItems[item.conversation].push(item);
      } else {
        newItems[item.conversation] = [item];
      }
    });

    set({ memberships: newItems });

  },
  sendMessage: async (senderId, conversationId, text) => {
    try {
      const message = await pocketbase.collection('messages').create<Message>({
        conversation: conversationId,
        text,
        sender: senderId,
      });
      set(state => {
        if (!state.messages.length) return {messages: [message]}
        return {
          messages: state.messages.some(m => m.id === message.id) ? [...state.messages] : [...state.messages, message]
        }
      })
    } catch (error) {
      console.error(error);
    }
  },
  messages: [],
  setMessages: (messages: Message[]) =>
  {
    set((state) => ({
      messages: messages,
    }));
  },
  addMessage: (message: Message) =>
  {
    set(state => {
      if (!state.messages.length) return {messages: [message]}
      return {
        messages: state.messages.some(m => m.id === message.id) ? [...state.messages] : [...state.messages, message]
      }
    })
  },
  reactions: {},
  setReactions: (reactions: ExpandedReaction[]) =>
  {
    const newItems: Record<string, ExpandedReaction[]> = {};
    reactions.forEach((item) => {
      if (newItems[item.message]) {
        newItems[item.message].push(item);
      } else {
        newItems[item.message] = [item];
      }
    });
    set({ reactions: newItems });
  },
  addReaction: (reaction: ExpandedReaction) =>
  {
    set(state => {
      if (!state.reactions[reaction.message]) {
        return {
          reactions: {
            ...state.reactions,
            [reaction.message]: [reaction],
          },
        };
      }
      return {
        reactions: {
          ...state.reactions,
          [reaction.message]: [...state.reactions[reaction.message], reaction],
        },
      };
    });
  },
  sendReaction: async (senderId, messageId, emoji) => {
    try {
      await pocketbase.collection('reactions').create({
        message: messageId,
        emoji,
        user: senderId,
      });
    } catch (error) {
      console.error(error);
    }
  },
  deleteReaction: async (id: string) => {
    try {
      await pocketbase.collection('reactions').delete(id);
    }
    catch (error) {
      console.error(error);
    }
  },
  removeReaction: (reaction: Reaction) => {
    try {
      set(state => {
        const newList = {...state.reactions};
        console.log(reaction.message, newList[reaction.message])
        newList[reaction.message] = newList[reaction.message].filter(r => r.id !== reaction.id);
        
        return {
          reactions: newList
        }
      })
    }
    catch (error) {
      console.error(error);
    }
  },
  saves: [],
  setSaves: (saves: ExpandedSave[]) =>
  {
    set((state) => ({
      saves: saves,
    }));
  },
  addSave: async (userId: string, savedBy: string) =>
  {
    try
    {
      const id = (await pocketbase.collection('saves').create<Save>({ user: userId, saved_by: savedBy })).id;
      const save = (await pocketbase.collection('saves').getOne<ExpandedSave>(id, {expand: 'user'}));
      set(state => {
        if (!state.saves.length) return {saves: [save]}
        return {
          saves: state.saves.some(m => m.id === save.id) ? [...state.saves] : [...state.saves, save]
        }
      })
    }
    catch (error) {
      console.error(error);
    }
  },
}));