import { Pressable, Dimensions } from 'react-native'
import { Text, View, H2, YStack } from 'tamagui'
import { PinataImage } from '../images/PinataImage'
import { EditableTitle } from '../atoms/EditableTitle'

const win = Dimensions.get('window')

const AddImage = ({ onAddImage }: { onAddImage: () => void }) => {
  return (
    <View width="100%" jc="center" ai="center">
      <Pressable onPress={onAddImage}>
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
  )
}

export const NewRef = ({ r }: { r: StagedRef }) => {
  console.log('new ref', r)
  // Image is a local uri. We upload to Pinata from there

  const minHeight = win.height * 0.7

  return (
    <View style={{ minHeight }}>
      <YStack gap="$3">
        {r?.image ? <PinataImage source={r.image} /> : <AddImage onAddImage={() => {}} />}
        {<EditableTitle title={r?.title || 'What is it'} />}
      </YStack>
    </View>
  )
}
