import { useState } from 'react'
import { Modal, Pressable, StyleSheet, useWindowDimensions } from 'react-native'
import { SimplePinataImage } from '../images/SimplePinataImage'
import { Image } from 'expo-image'

export default function PressableImage({
  source,
  size,
  localUri,
}: {
  source: string
  size: number
  localUri?: string
}) {
  const [visible, setVisible] = useState(false)

  const { width, height } = useWindowDimensions()

  return (
    <>
      <Pressable onPress={() => setVisible(true)}>
        {localUri ? (
          <Image
            source={{ uri: localUri }}
            style={{ width: size, height: size, backgroundColor: 'transparent' }}
            contentFit="cover"
          />
        ) : (
          <SimplePinataImage
            originalSource={source}
            imageOptions={{ width: size, height: size }}
            style={{ width: size, height: size, backgroundColor: 'transparent' }}
          />
        )}
      </Pressable>

      <Modal visible={visible} transparent onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          {localUri ? (
            <Image
              source={{ uri: localUri }}
              style={{ width: width, height: width }}
              contentFit="contain"
            />
          ) : (
            <SimplePinataImage
              originalSource={source}
              style={{ width: width, height: width }}
              imageOptions={{
                width: width,
                height: height,
              }}
            />
          )}
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
