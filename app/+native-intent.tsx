import { getShareExtensionKey } from 'expo-share-intent'
import { router } from 'expo-router'
import { pocketbase } from '@/features/pocketbase'

export function redirectSystemPath({ path, initial }: { path: string; initial: string }) {
  let returnValue = '/'
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
      console.debug('[expo-router-native-intent] redirect to ShareIntent screen')

      if (!pocketbase.authStore.isValid) returnValue = '/login'

      returnValue = `/user/${pocketbase?.authStore?.record?.userName}`
    } else {
      returnValue = path
    }
  } catch {
    returnValue = '/'
  }

  return returnValue
}
