import { create } from 'zustand';
import { Conversation, ExpandedMembership, Message } from './types';
import { pocketbase } from '../pocketbase';


type MessageStore = {
  conversations: Record<string, Conversation>;
  setConversations: (conversations: Conversation[]) => void;
  updateConversation: (conversation: Conversation) => void;
  memberships: Record<string, ExpandedMembership[]>;
  setMembership: (convId: string, members: ExpandedMembership[]) => void;
  setMemberships: (memberships: ExpandedMembership[]) => void;
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
  memberships: {},
  setMembership: (convId, members) =>
  {
    set((state) => ({
      memberships: { ...state.memberships, [convId]: members },
    }));
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
    set (state => ({
      messages: [...state.messages, message]
    }))
  }

}));