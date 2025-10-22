import { useState, useEffect } from 'react'
import { StyleSheet } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { ensureMediaLibraryAccess } from '@/features/media/permissions'

export function Picker({
  onSuccess,
  onCancel,
  disablePinata = false,
  options,
  useCamera = false,
}: {
  onCancel: () => void
  onSuccess: (asset: ImagePicker.ImagePickerAsset) => void
  disablePinata?: boolean
  options?: ImagePicker.ImagePickerOptions
  useCamera?: boolean
}) {
  useEffect(() => {
    const pickImage = async () => {
      try {
        // Request camera permission if using camera
        if (useCamera) {
          console.log('📸 Requesting camera permissions...')
          const { status } = await ImagePicker.requestCameraPermissionsAsync()
          if (status !== 'granted') {
            console.log('📸 Camera permission denied')
            onCancel()
            return
          }
        } else {
          const hasPermission = await ensureMediaLibraryAccess()
          if (!hasPermission) {
            onCancel()
            return
          }
        }

        console.log(`📸 Picker component mounted, launching ${useCamera ? 'camera' : 'image library'}...`)
        const pickerOptions: ImagePicker.ImagePickerOptions = {
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
          mediaTypes: ['images'],
          ...(options ?? {}),
        }

        console.log(`📸 Calling ${useCamera ? 'launchCameraAsync' : 'launchImageLibraryAsync'} with options:`, pickerOptions)
        let result = useCamera
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions)
        console.log('📸 Image picker result:', result.canceled ? 'canceled' : 'success')

        if (!result.canceled) {
          // if (!disablePinata) {
          //   // Errors and loading state are handled from inside the upload function
          //   const url = await pinataUpload(result.assets[0])

          //   onSuccess(url)
          // } else {
          onSuccess(result.assets[0])
          // }
        } else {
          onCancel()
        }
      } catch (e) {
        console.error(e)
      }
    }

    pickImage()

    return () => {
      // Cleanup
    }
  }, [])

  return <></>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 200,
    height: 200,
  },
})
