import { useState, useEffect } from 'react'
import { StyleSheet } from 'react-native'
import * as ImagePicker from 'expo-image-picker'

/**
 * Create a signed pinata url
 */
export const pinataSignedUrl = async (cid: string) => {
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_PIN_JWT}`,
      'Content-Type': 'application/json',
    },
    body: `{"url":"https://violet-fashionable-blackbird-836.mypinata.cloud/files/${cid}","expires":500000,"date":${Date.now()},"method":"GET"}`,
  }

  try {
    const response = await fetch('https://api.pinata.cloud/v3/files/sign', options)
    return await response.json()
  } catch (error) {
    console.error(error)
  }
}

/**
 * Upload pinata
 *
 * @param asset
 * @returns
 */
export const pinataUpload = async (asset: ImagePicker.ImagePickerAsset) => {
  console.log('Called pinata with', asset)

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

    const { data: url } = await pinataSignedUrl(result.data.cid)

    console.log('url', url)

    return url
  } catch (error) {
    console.error(error)
  }
}

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
