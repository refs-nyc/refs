import { useState, useEffect } from 'react'
import { Button } from '@my/ui'
import { View, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'

export function Picker({
  onSuccess,
  onCancel,
}: {
  onCancel: () => void
  onSuccess: (uri: string) => void
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
        console.log(result)

        if (!result.canceled) {
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
