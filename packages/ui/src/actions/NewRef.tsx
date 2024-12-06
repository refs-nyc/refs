import { Pressable, Dimensions } from 'react-native'
import { Text, View } from 'tamagui'
import { PinataImage } from '../images/PinataImage'

const win = Dimensions.get('window')

const AddImage = ({ onAddImage }: { onAddImage: () => void }) => {
  return (
    <>
      <Pressable onPress={onAddImage}>
        <View>
          <Text>+</Text>
        </View>
      </Pressable>
    </>
  )
}

export const NewRef = ({ title, image }: { title?: string; image?: string }) => {
  // Image is a local uri. We upload to Pinata from there

  const minHeight = win.height * 0.7

  return (
    <View style={{ minHeight }}>
      {image ? <PinataImage source={image} /> : <AddImage onAddImage={() => {}} />}
    </View>
  )
}
