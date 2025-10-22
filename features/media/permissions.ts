import { Alert, Linking, Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'

type MediaPermission =
  | ImagePicker.MediaLibraryPermissionResponse
  | ImagePicker.PermissionResponse

type AccessPrivilege = 'all' | 'limited' | 'none'

const getAccessPrivileges = (
  permission: MediaPermission
): AccessPrivilege | undefined =>
  'accessPrivileges' in permission
    ? (permission.accessPrivileges as AccessPrivilege | undefined)
    : undefined

const requestFullAccess = async () => {
  const requestFn: any = ImagePicker.requestMediaLibraryPermissionsAsync
  if (typeof requestFn === 'function') {
    try {
      return await requestFn({ accessPrivileges: 'all' })
    } catch {
      return requestFn()
    }
  }
  return ImagePicker.requestMediaLibraryPermissionsAsync()
}

/**
 * Requests media library access with a preference for full access on iOS.
 * Returns true when the user has granted at least limited access.
 * Optionally displays guidance for upgrading to full access if the
 * permission remains limited.
 */
export async function ensureMediaLibraryAccess(options?: {
  promptForFullAccess?: boolean
}): Promise<boolean> {
  const { promptForFullAccess = true } = options ?? {}

  let permission = await ImagePicker.getMediaLibraryPermissionsAsync()
  const hasFullAccess =
    permission.status === 'granted' && getAccessPrivileges(permission) === 'all'

  if (!hasFullAccess) {
    permission = await requestFullAccess()
  }

  if (permission.status !== 'granted') {
    if (promptForFullAccess && Platform.OS === 'ios') {
      Alert.alert(
        'Photo Access Needed',
        'Refs needs permission to access your photos so you can add refs from your camera roll.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              void Linking.openSettings()
            },
          },
        ]
      )
    }
    return false
  }

  const access = getAccessPrivileges(permission)
  const grantedWithFullAccess = access === 'all' || access === undefined

  if (!grantedWithFullAccess && Platform.OS === 'ios' && promptForFullAccess) {
    Alert.alert(
      'Allow Full Photo Access',
      'Give Refs access to your full photo library to add refs without extra prompts.',
      [
        { text: 'Keep Limited', style: 'cancel' },
        {
          text: 'Select Photos…',
          onPress: () => {
            const picker: any = (ImagePicker as any).presentLimitedLibraryPickerAsync
            if (typeof picker === 'function') {
              void picker()
            } else {
              void Linking.openSettings()
            }
          },
        },
        {
          text: 'Open Settings',
          onPress: () => {
            void Linking.openSettings()
          },
        },
      ]
    )
  }

  return true
}
