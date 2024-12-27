import type { Item, CompleteRef } from '@/features/pocketbase/stores/types'
import { useState } from 'react'
import { Heading } from '../typo/Heading'
import { TextInput } from 'react-native'
import { YStack } from '../core/Stacks'
import { Button } from '../buttons/Button'
import { View } from 'react-native'
import { s, c } from '@/features/style'
import { useRefStore } from '@/features/pocketbase/stores/refs'

export const CategoriseRef = ({
  item,
  completeRef,
  onComplete,
}: {
  item: Item
  completeRef: CompleteRef
  onComplete: (r: CompleteRef) => void
}) => {
  const { addMetaData } = useRefStore()
  const [category, setCategory] = useState('')
  const [meta, setMeta] = useState('')

  console.log('categorise ref with ID: ', completeRef.id)

  const categorise = (cat: string) => {
    setMeta('')
    setCategory(cat)
  }

  const done = async () => {
    try {
      const record = await addMetaData(completeRef.id, { cat: category, meta })
      if (record) onComplete(record)
    } catch (error) {
      console.error(error)
      throw new Error(error)
    }
  }

  return (
    <View>
      <Heading tag="p">Is it a...</Heading>
      <YStack gap={s.$2}>
        <Button
          variant="basicLeft"
          iconColor={c.black}
          onPress={() => categorise('place')}
          iconBefore="location"
          title="Place"
        />
        {category === 'place' && (
          <TextInput
            placeholder="Enter a location (eg Clinton Hill, Brooklyn)"
            onChangeText={setMeta}
          ></TextInput>
        )}
        <Button variant="fluid" onPress={done} title="Done" />
      </YStack>
    </View>
  )
}
