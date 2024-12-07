import { PinataSDK } from 'pinata'
import { useState, useEffect } from 'react'
import { Button } from '@my/ui'
import { View, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'

export function Picker({
  onSuccess,
  onCancel,
  disablePinata = false,
}: {
  onCancel: () => void
  onSuccess: (uri: string) => void
  disablePinata: boolean
}) {
  const pinataUpload = async (asset: ImagePicker.ImagePickerAsset) => {
    const form = new FormData()

    form.append('name', asset?.fileName || 'test')
    form.append('file', {
      uri: asset.uri,
      name: asset?.fileName || 'testimage',
      type: asset?.mimeType || 'image/jpeg',
    })

    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_PIN_JWT}`,
        'Content-Type': 'multipart/form-data',
      },
    }

    options.body = form

    try {
      const response = await fetch('https://uploads.pinata.cloud/v3/files', options)
      const result = await response.json()

      // const { data: url } = await
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    const pickImage = async () => {
      // No permissions request is necessary for launching the image library
      try {
        console.log('coming up? ')
        let result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        })
        console.log(result)

        if (!result.canceled) {
          pinataUpload(result.assets[0])
          onSuccess(result.assets[0].uri)
        } else {
          console.log(result.canceled)
          onCancel()
        }
      } catch (e) {
        console.error(e)
      }
    }

    pickImage()
  }, [])
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
