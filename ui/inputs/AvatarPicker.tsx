import { useState } from 'react'
import { Pressable, Dimensions, View } from 'react-native'
import { Heading, YStack } from '@/ui'
import { Picker } from '../inputs/Picker'
import { PinataImage } from '../images/PinataImage'
import { Button } from '../buttons/Button'
import { s } from '../../features/style'
import type { ImagePickerAsset } from 'expo-image-picker'

const win = Dimensions.get('window')

export const AddImage = ({
  onAddImage,
  hideNew = false,
  children,
}: {
  onAddImage: (a: ImagePickerAsset) => ImagePickerAsset
  hideNew?: boolean
  children?: React.ReactNode
}) => {
  const [picking, setPicking] = useState(false)

  return (
    <>
      {picking && <Picker onSuccess={onAddImage} onCancel={() => setPicking(false)} />}
      <View style={{ justifyContent: 'center', alignItems: 'center', gap: s.$4 }}>
        {!hideNew && (
          <Pressable onPress={() => setPicking(true)}>
            <View
              style={{
                width: s.$12,
                height: s.$12,
                justifyContent: 'center',
                alignItems: 'center',
                borderColor: 'black',
                borderWidth: s.$025,
                borderRadius: 1000,
              }}
            >
              <Heading tag="h1light">+</Heading>
            </View>
          </Pressable>
        )}
        <Button
          iconBefore="images"
          variant="small"
          title="Add from Camera Roll"
          onPress={() => setPicking(true)}
        />
        <View style={{ height: s.$2, width: '100%', justifyContent: 'center' }}>{children}</View>
      </View>
    </>
  )
}

export const AvatarPicker = ({
  source = '',
  children,
  placeholder = 'What is it',
  onComplete,
}: {
  source: string
  children: React.ReactNode
  placeholder: string
  onComplete: (s: string) => void
}) => {
  const [currentSource, setCurrentSource] = useState(source)
  const [imageAsset, setImageAsset] = useState<ImagePickerAsset | null>(null)
  const [pinataSource, setPinataSource] = useState('')

  const updatePinata = (image: string) => {
    setPinataSource(image)

    // Side effects...
    onComplete(image)
  }

  return (
    <View style={{ justifyContent: 'center', width: '100%' }}>
      <YStack gap={s.$1} style={{ justifyContent: 'center', alignItems: 'center' }}>
        {imageAsset ? (
          <YStack gap={s.$2} style={{ justifyContent: 'center', alignItems: 'center' }}>
            <PinataImage
              round
              asset={imageAsset}
              onSuccess={updatePinata}
              onFail={() => console.error('Cant ul')}
              style={{ width: s.$12, height: s.$12 }}
            />
            <AddImage
              hideNew
              onAddImage={(a: ImagePickerAsset) => {
                setImageAsset(null)
                setImageAsset(a)
                return a
              }}
            >
              {children}
            </AddImage>
          </YStack>
        ) : (
          <AddImage
            onAddImage={(a: ImagePickerAsset) => {
              setImageAsset(null)
              setImageAsset(a)
              return a
            }}
          >
            {children}
          </AddImage>
        )}
      </YStack>
    </View>
  )
}
