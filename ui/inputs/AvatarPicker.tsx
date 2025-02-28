import { useState } from 'react'
import { Pressable, Dimensions, View } from 'react-native'
import { YStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
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
                width: 200,
                height: 200,
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
        <View style={{ height: s.$2, width: '100%', justifyContent: 'center' }}>{children}</View>
      </View>
    </>
  )
}

export const AvatarPicker = ({
  source = '',
  children,
  onComplete,
  onReplace,
}: {
  source: string
  children: React.ReactNode
  onComplete: (s: string) => void
  onReplace: () => void
}) => {
  const [imageAsset, setImageAsset] = useState<ImagePickerAsset | null>(null)

  const reset = () => {
    setImageAsset(null)
  }

  return (
    <View style={{ justifyContent: 'center', width: '100%' }}>
      <YStack gap={s.$1} style={{ justifyContent: 'center', alignItems: 'center' }}>
        {imageAsset ? (
          <YStack gap={s.$2} style={{ justifyContent: 'center', alignItems: 'center' }}>
            <PinataImage
              round
              asset={imageAsset}
              onSuccess={(image) => onComplete(image)}
              onReplace={() => {
                reset()
                onReplace()
              }}
              onFail={() => {
                reset()
                console.error('Cant ul')
              }}
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
