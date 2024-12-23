import AsyncStorage from '@react-native-async-storage/async-storage'
import PocketBase, { AsyncAuthStore } from 'pocketbase'

const store = new AsyncAuthStore({
  save: async (serialized) => AsyncStorage.setItem('pb_auth', serialized),
  initial: AsyncStorage.getItem('pb_auth'),
})

console.log('creating new pocketbase at ', process.env.EXPO_PUBLIC_POCKETBASE_URL)

const pocketbase = new PocketBase(process.env.EXPO_PUBLIC_POCKETBASE_URL, store)

pocketbase.autoCancellation(false)

export { pocketbase }
