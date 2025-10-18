import { ExpandedItem } from '@/features/types'
import { c, s } from '@/features/style'
import { Button } from '@/ui/buttons/Button'
import { Text, View } from 'react-native'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'

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
        paddingTop: s.$2,
        gap: s.$1,
        alignItems: 'center',
      }}
    >
      <Text 
        style={{ 
          color: c.surface, 
          fontSize: 20,
          fontFamily: 'InterMedium',
          fontWeight: '600',
          textAlign: 'center',
          paddingHorizontal: s.$2,
        }}
      >
        Do what with {ref.title}?
      </Text>
      {/* display the image of the item to be replaced */}
      {image && (
        <View style={{ alignItems: 'center' }}>
          <SimplePinataImage
            originalSource={image}
            style={{ height: 120, width: 120, borderRadius: 15 }}
            imageOptions={{
              width: 120,
              height: 120,
            }}
          />
        </View>
      )}
      <View style={{ width: '100%', gap: s.$1, marginTop: s.$075 }}>
        <Button title="Remove" variant="basic" onPress={removeFromProfile} />
        <Button title="Send to backlog" onPress={moveToBacklog} />
      </View>
    </View>
  )
}
