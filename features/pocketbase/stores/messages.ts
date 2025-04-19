import { create } from 'zustand';
import { Conversation, ExpandedMembership } from './types';
import { pocketbase } from '../pocketbase';


type MessageStore = {
  conversations: Record<string, Conversation>;
  setConversations: (conversations: Conversation[]) => void;
  memberships: Record<string, ExpandedMembership[]>;
  setMembership: (convId: string, members: ExpandedMembership[]) => void;
  sendMessage: (sendreId: string, conversationId: string, text: string) => Promise<void>;
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
  memberships: {},
  setMembership: (convId, members) =>
  {
    set((state) => ({
      memberships: { ...state.memberships, [convId]: members },
    }));
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
}));