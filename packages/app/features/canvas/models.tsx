import uuid from 'react-native-uuid'
import { create } from 'zustand'

export const models = {
  profiles: {
    did: 'primary',
    firstname: 'string',
    lastname: 'string',
    username: 'string',
    location: 'string?',
    geolocation: 'string?',
    image: 'string?',
    items: '@items[]',
  },
  items: {
    id: 'primary',
    title: 'string',
    text: 'string?',
    image: 'string?',
    location: 'string?',
    url: 'string?',
    children: '@items[]',
    createdAt: 'number', // sort by last created at first
    deletedAt: 'number?', // sort by last created at first
  },
  // Later, @raymond to rewrite: https://docs.canvas.xyz/examples-encrypted-chat.html
  messages: {
    id: 'primary', // id should always be `${userA}/${userB}` where userA is lexicographically first compared to userB
    message: 'string',
    createdAt: 'number',
  },
} as const

export const useItemStore = create((set) => ({
  items: [],
  push: (newItem) => {
    const finalItem = { ...newItem, id: uuid.v4() }
    set((state) => ({ items: [...state.items, finalItem] }))
  },
  remove: (id) => {
    set((state) => ({
      items: [...state.items.filter((i) => i.id !== id)],
    }))
  },
}))
