import { useState } from 'react'
import { prepareRef } from '../@refs/core'
import { Pressable, Dimensions } from 'react-native'
import { Text, View, H2, YStack } from 'tamagui'
import { Picker } from '../inputs/Picker'
import { PinataImage } from '../images/PinataImage'
import { EditableTitle } from '../atoms/EditableTitle'
import { useItemStore } from 'app/features/canvas/models'
import { MainButton } from '../buttons/Button'

const win = Dimensions.get('window')

const AddImage = ({ onAddImage }: { onAddImage: (str) => string }) => {
  const [picking, setPicking] = useState(false)

  return (
    <>
      {picking && <Picker onSuccess={onAddImage} onCancel={() => setPicking(false)} />}
      <View width="100%" jc="center" ai="center">
        <Pressable onPress={() => setPicking(true)}>
          <View
            style={{ width: 200, height: 200 }}
            jc="center"
            ai="center"
            borderColor="black"
            borderWidth="$1"
            borderRadius={10}
          >
            <H2>+</H2>
          </View>
        </Pressable>
      </View>
    </>
  )
}

export const NewRef = ({ r, onComplete }: { r: StagedRef; onComplete: (i: RefsItem) => void }) => {
  const { push } = useItemStore()

  const [currentRef, setCurrentRef] = useState<StagedRef>(r)

  const minHeight = win.height * 0.7

  const updateRef = (image) => {
    const u = { ...r, image }
    setCurrentRef(u)
  }

  const submit = () => {
    const finalRef = prepareRef(currentRef)

    push(finalRef)

    onComplete(finalRef)
  }

  return (
    <>
      <View style={{ minHeight }}>
        <YStack gap="$3">
          {r?.image ? <PinataImage source={r.image} /> : <AddImage onAddImage={updateRef} />}
          {<EditableTitle title={r?.title || 'What is it'} />}
        </YStack>
      </View>

      <MainButton disabled={!currentRef.title} onPress={submit}>
        Done
      </MainButton>
    </>
  )
}
