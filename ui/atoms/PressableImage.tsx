import { useState } from 'react'
import { Modal, Pressable, StyleSheet, useWindowDimensions } from 'react-native'
import { SimplePinataImage } from '../images/SimplePinataImage'

export default function PressableImage({ source, size }: { source: string; size: number }) {
  const [visible, setVisible] = useState(false)

  const { width, height } = useWindowDimensions()

  return (
    <>
      <Pressable onPress={() => setVisible(true)}>
        <SimplePinataImage
          originalSource={source}
          imageOptions={{ width: size, height: size }}
          style={{ width: size, height: size, backgroundColor: 'transparent' }}
        />
      </Pressable>

      <Modal visible={visible} transparent onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <SimplePinataImage
            originalSource={source}
            style={{ width: width, height: width }}
            imageOptions={{
              width: width,
              height: height,
            }}
          />
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
