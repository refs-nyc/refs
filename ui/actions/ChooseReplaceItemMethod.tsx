import { ExpandedItem } from '@/features/types'
import { c, s } from '@/features/style'
import { Button } from '@/ui/buttons/Button'
import { Text, View } from 'react-native'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { isPinataUrl } from '@/features/pinata'
import { Image } from 'expo-image'

export const ChooseReplaceItemMethod = ({
  itemToReplace,
  removeFromProfile,
  moveToBacklog,
}: {
  itemToReplace: ExpandedItem
  removeFromProfile: () => Promise<void>
  moveToBacklog: () => Promise<void>
}) => {
  const ref = itemToReplace.expand.ref!

  const image = itemToReplace.image || ref.image

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: s.$3,
        gap: s.$1,
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <Text style={{ color: c.muted }}>Do what with {ref.title}?</Text>
      </View>
      {/* display the image of the item to be replaced */}
      {image && (
        <View style={{ alignItems: 'center' }}>
          {isPinataUrl(image) ? (
            <SimplePinataImage
              originalSource={image}
              style={{ height: 100, width: 100 }}
              imageOptions={{
                width: 100,
                height: 100,
              }}
            />
          ) : (
            <Image
              source={image}
              style={{
                width: 100,
                height: 100,
              }}
            />
          )}
        </View>
      )}
      <Button title="Remove" variant="basic" onPress={removeFromProfile} />
      <Button title="Send to backlog" onPress={moveToBacklog} />
    </View>
  )
}
