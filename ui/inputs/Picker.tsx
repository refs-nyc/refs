import { useState, useEffect } from 'react'
import { StyleSheet } from 'react-native'
import * as ImagePicker from 'expo-image-picker'

export function Picker({
  onSuccess,
  onCancel,
  disablePinata = false,
}: {
  onCancel: () => void
  onSuccess: (asset: ImagePicker.ImagePickerAsset) => void
  disablePinata?: boolean
}) {
  useEffect(() => {
    console.log('PICKER')
    const pickImage = async () => {
      // No permissions request is necessary for launching the image library
      try {
        console.log('coming up? ')
        let result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        })

        if (!result.canceled) {
          // if (!disablePinata) {
          //   // Errors and loading state are handled from inside the upload function
          //   const url = await pinataUpload(result.assets[0])

          //   onSuccess(url)
          // } else {
          onSuccess(result.assets[0])
          // }
        } else {
          console.log(result.canceled)
          onCancel()
        }
      } catch (e) {
        console.error(e)
      }
    }

    pickImage()

    return () => {
      console.log('picker is done')
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
