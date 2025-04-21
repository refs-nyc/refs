import { create } from 'zustand';
import { Conversation, ExpandedMembership, Message } from './types';
import { pocketbase } from '../pocketbase';


type MessageStore = {
  conversations: Record<string, Conversation>;
  setConversations: (conversations: Conversation[]) => void;
  updateConversation: (conversation: Conversation) => void;
  createConversation: (is_direct: boolean, creatorId: string, otherMemberIds: string[]) => Promise<string>;
  addConversation (conversation: Conversation): void;
  memberships: Record<string, ExpandedMembership[]>;
  setMembership: (convId: string, members: ExpandedMembership[]) => void;
  setMemberships: (memberships: ExpandedMembership[]) => void;
  addMembership: (membership: ExpandedMembership) => void;
  sendMessage: (sendreId: string, conversationId: string, text: string) => Promise<void>;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
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
  createConversation: async (is_direct: boolean, creatorId: string, otherMemberIds: string[]): Promise<string> =>
  {
    console.log(`creating conversation with ${otherMemberIds.length} users: ${otherMemberIds}`)
    const newConversation = await pocketbase.collection('conversations').create({is_direct});

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
  },
  addConversation: (conversation) =>
  {
    set((state) => ({
      conversations: { ...state.conversations, [conversation.id]: conversation }
    }));
  },
  memberships: {},
  setMembership: (convId, members) =>
  {
    set((state) => ({
      memberships: { ...state.memberships, [convId]: members },
    }));
  },
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
  // addMembership: (membership) =>
  // {
  //   set((state) => ({
  //     memberships: { ...state.memberships, [membership.conversation]: [...state.memberships[membership.conversation], membership] },
  //   }));
  // },
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
      await pocketbase.collection('messages').create({
        conversation: conversationId,
        text,
        sender: senderId,
      });
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
      console.log(state.messages)
      if (!state.messages.length) return {...state, messages: [message]}
      return {
        messages: state.messages.some(m => m.id === message.id) ? [...state.messages] : [...state.messages, message]
      }
    })
  }

}));