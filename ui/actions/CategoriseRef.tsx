import type { ExpandedItem, CompleteRef, StagedRef } from '@/features/pocketbase/stores/types'
import { useState } from 'react'
import { Heading } from '../typo/Heading'
import { BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet'
import { XStack, YStack } from '../core/Stacks'
import { Button } from '../buttons/Button'
import { View, ScrollView, Pressable, Text } from 'react-native'
import { s, c } from '@/features/style'
import { useRefStore } from '@/features/pocketbase/stores/refs'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import Ionicons from '@expo/vector-icons/Ionicons'

export const CategoriseRef = ({
  item,
  existingRef,
  onBack,
  onComplete,
}: {
  item: ExpandedItem
  existingRef: CompleteRef | StagedRef
  onBack: () => void
  onComplete: (r: CompleteRef) => void
}) => {
  const { addMetaData } = useRefStore()
  const [category, setCategory] = useState('')
  const [meta, setMeta] = useState('')

  console.log('categorise ref with ID: ', existingRef.id)

  const categorise = (cat: string) => {
    setMeta('')
    setCategory(cat)
  }

  const done = async () => {
    if (!existingRef.id) return

    try {
      const record = await addMetaData(existingRef.id, { cat: category, meta })
      console.log('completed categorisation: ', record)
      if (record) onComplete(record)
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  console.log(item)
  console.log('item.image', item.image)
  return (
    <>
      <ScrollView
        contentContainerStyle={{ alignItems: 'center', paddingTop: s.$4, paddingBottom: s.$8 }}
      >
        <YStack gap={s.$08} style={{ width: '100%', alignItems: 'center', paddingBottom: s.$4 }}>
          <XStack style={{ width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={onBack} style={{ flexGrow: 1, flexBasis: 0 }}>
              <Ionicons name="chevron-back" size={s.$2} color={c.surface} />
            </Pressable>
            <View style={{ margin: 'auto' }}>
              {item.image && (
                <SimplePinataImage
                  originalSource={item.image}
                  imageOptions={{ width: s.$12 * 2, height: s.$12 * 2 }}
                  style={{
                    width: s.$12,
                    height: s.$12,
                    borderRadius: s.$09,
                  }}
                />
              )}
            </View>
            {/* this is needed so that the image is centered */}
            <View style={{ flexGrow: 1, flexBasis: 0 }} />
          </XStack>
          <Heading tag="h1" style={{ color: c.surface }}>
            {item?.expand?.ref.title}
          </Heading>
        </YStack>
        <YStack gap={s.$08} style={{ width: '100%' }}>
          <YStack gap={s.$08} style={{ width: '100%' }}>
            <XStack style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: c.white, fontWeight: 'bold' }}>Location</Text>
              <Text style={{ color: c.white, fontStyle: 'italic' }}>
                (e.g. Clinton Hill, Brooklyn)
              </Text>
            </XStack>
            <TextInput
              autoFocus={true}
              placeholderTextColor={c.muted}
              style={{
                backgroundColor: c.surface,
                borderRadius: s.$075,
                width: '100%',
                paddingVertical: s.$08,
                paddingHorizontal: s.$1,
                marginBottom: s.$08,
              }}
              placeholder="Is this a place? If not, no worries"
              onChangeText={setMeta}
            ></TextInput>
          </YStack>
          <YStack gap={s.$08} style={{ width: '100%' }}>
            <XStack style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: c.white, fontWeight: 'bold' }}>Author</Text>
              <Text style={{ color: c.white, fontStyle: 'italic' }}>
                (e.g. Arlo Parks, Kubrick)
              </Text>
            </XStack>
            <TextInput
              autoFocus={true}
              placeholderTextColor={c.grey2}
              style={{
                backgroundColor: c.surface,
                borderRadius: s.$075,
                width: '100%',
                paddingVertical: s.$08,
                paddingHorizontal: s.$1,
                marginBottom: s.$08,
              }}
              placeholder="Is this a book, movie or work of art?"
              onChangeText={setMeta}
            ></TextInput>
          </YStack>
        </YStack>
        <View style={{ paddingTop: s.$6 }}>
          <Button variant="whiteInverted" onPress={done} title="Finish" />
        </View>
      </ScrollView>
    </>
  )
}
