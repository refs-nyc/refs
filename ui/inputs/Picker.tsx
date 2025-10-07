import { useState, useEffect } from 'react'
import { StyleSheet } from 'react-native'
import * as ImagePicker from 'expo-image-picker'

export function Picker({
  onSuccess,
  onCancel,
  disablePinata = false,
  options,
}: {
  onCancel: () => void
  onSuccess: (asset: ImagePicker.ImagePickerAsset) => void
  disablePinata?: boolean
  options?: ImagePicker.ImagePickerOptions
}) {
  useEffect(() => {
    const pickImage = async () => {
      // No permissions request is necessary for launching the image library
      try {
        console.log('📸 Picker component mounted, launching image library...')
        const pickerOptions: ImagePicker.ImagePickerOptions = {
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
          mediaTypes: ['images'],
          ...(options ?? {}),
        }

        console.log('📸 Calling launchImageLibraryAsync with options:', pickerOptions)
        let result = await ImagePicker.launchImageLibraryAsync(pickerOptions)
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
