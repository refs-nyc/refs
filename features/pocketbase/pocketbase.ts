import AsyncStorage from '@react-native-async-storage/async-storage'
import PocketBase, { AsyncAuthStore } from 'pocketbase'

const store = new AsyncAuthStore({
  save: async (serialized) => AsyncStorage.setItem('pb_auth', serialized),
  initial: AsyncStorage.getItem('pb_auth'),
})

const pocketbase = new PocketBase('https://refs.enabler.space', store)

pocketbase.autoCancellation(false)

export { pocketbase }
