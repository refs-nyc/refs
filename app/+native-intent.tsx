import { getShareExtensionKey } from 'expo-share-intent'
import { router } from 'expo-router'

export function redirectSystemPath({ path, initial }: { path: string; initial: string }) {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
      // redirect to the ShareIntent Screen to handle data with the hook
      console.debug('[expo-router-native-intent] redirect to ShareIntent screen')
      // router.push('/share-intent')
      // console.debug('Call to push done')
      console.log(path)
      return '/share-intent'
    }
    return path
  } catch {
    return '/'
  }
}
