import { create } from 'zustand';
import { Conversation, ExpandedMembership } from './types';


type MessageStore = {
  conversations: Record<string, Conversation>;
  setConversations: (conversations: Conversation[]) => void;
  memberships: Record<string, ExpandedMembership[]>;
  setMembership: (convId: string, members: ExpandedMembership[]) => void;
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
}));