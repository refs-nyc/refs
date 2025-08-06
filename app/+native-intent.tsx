import { getShareExtensionKey } from 'expo-share-intent'

export function redirectSystemPath({ path, initial }: { path: string; initial: string }) {
  let returnValue = '/'
  try {
    // TODO: figure out how to access the current user's authStore value, if it exists
    // What is this code even for?

    // if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
    //   console.debug('[expo-router-native-intent] redirect to ShareIntent screen')

    //   if (!pocketbase.authStore.isValid) returnValue = '/login'

    //   returnValue = `/user/${pocketbase?.authStore?.record?.did}`
    // } else {
    //   returnValue = path
    // }
    returnValue = path
  } catch {
    returnValue = '/'
  }

  return returnValue
}
