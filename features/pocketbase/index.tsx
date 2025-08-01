import AsyncStorage from '@react-native-async-storage/async-storage'
import PocketBase, { AsyncAuthStore } from 'pocketbase'
import eventsource from 'react-native-sse'

// For pocketbase
// @ts-ignore
global.EventSource = eventsource

const store = new AsyncAuthStore({
  save: async (serialized) => AsyncStorage.setItem('pb_auth', serialized),
  initial: AsyncStorage.getItem('pb_auth'),
})

const pocketbase = new PocketBase(process.env.EXPO_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090', store)

pocketbase.autoCancellation(false)

export { pocketbase }
