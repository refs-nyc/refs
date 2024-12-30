import type { Item, CompleteRef } from '@/features/pocketbase/stores/types'
import { useState } from 'react'
import { Heading } from '../typo/Heading'
import { TextInput } from 'react-native'
import { YStack } from '../core/Stacks'
import { Button } from '../buttons/Button'
import { View, ScrollView } from 'react-native'
import { s, c } from '@/features/style'
import { useRefStore } from '@/features/pocketbase/stores/refs'
import { SimplePinatatImage } from '@/ui/images/SimplePinataImage'

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
    <>
      <ScrollView
        contentContainerStyle={{ alignItems: 'center', paddingTop: s.$4, paddingBottom: s.$8 }}
      >
        <View>
          {item?.expand?.ref?.image && (
            <SimplePinatatImage originalSource={item.expand.ref.image} />
          )}
          <Heading tag="h1">{item?.expand.ref.title}</Heading>
        </View>
        <Heading style={{ width: '100%', marginBottom: s.$2 }} tag="p">
          Is it a
        </Heading>
        <YStack gap={s.$08} style={{ justifyContent: 'center', width: '100%' }}>
          <View style={{ width: '100%', paddingHorizontal: s.$2 }}>
            <Button
              variant="basicLeft"
              iconColor={c.accent}
              iconSize={s.$2}
              onPress={() => categorise('place')}
              iconBefore="location"
              title="Place"
            />
          </View>
          {category === 'place' && (
            <>
              <TextInput
                autoFocus={true}
                style={{
                  backgroundColor: c.white,
                  borderRadius: s.$075,
                  width: '100%',
                  paddingVertical: s.$08,
                  paddingHorizontal: s.$1,
                  marginBottom: s.$08,
                }}
                placeholder="Enter a location (eg Clinton Hill, Brooklyn)"
                onChangeText={setMeta}
              ></TextInput>
              {/* <Button variant="fluid" onPress={done} title="Done" /> */}
            </>
          )}
        </YStack>
        <YStack gap={s.$08} style={{ justifyContent: 'center', width: '100%' }}>
          <View style={{ width: '100%', paddingHorizontal: s.$2 }}>
            <Button
              variant="basicLeft"
              iconColor={c.accent}
              iconSize={s.$2}
              onPress={() => categorise('artwork')}
              iconBefore="color-palette-outline"
              title="Work of art"
            />
          </View>
          {category === 'artwork' && (
            <>
              <TextInput
                autoFocus={true}
                style={{
                  backgroundColor: c.white,
                  borderRadius: s.$075,
                  width: '100%',
                  paddingVertical: s.$08,
                  paddingHorizontal: s.$1,
                  marginBottom: s.$08,
                }}
                placeholder="Enter an author (eg Arlo Parks, Kubrick)"
                onChangeText={setMeta}
              ></TextInput>
              {/* <Button variant="fluid" onPress={done} title="Done" /> */}
            </>
          )}
        </YStack>
        <YStack gap={s.$08} style={{ justifyContent: 'center', width: '100%' }}>
          <View style={{ width: '100%', paddingHorizontal: s.$2 }}>
            <Button
              variant="basicLeft"
              iconColor={c.accent}
              iconSize={s.$2}
              onPress={() => categorise('other')}
              iconBefore="infinite"
              title="Other"
            />
          </View>
          {category === 'other' && (
            <>
              <TextInput
                autoFocus={true}
                style={{
                  backgroundColor: c.white,
                  borderRadius: s.$075,
                  width: '100%',
                  paddingVertical: s.$08,
                  paddingHorizontal: s.$1,
                  marginBottom: s.$08,
                }}
                placeholder="Explain its essence"
                onChangeText={setMeta}
              ></TextInput>
            </>
          )}
        </YStack>
      </ScrollView>
      <Button
        style={{ position: 'absolute', bottom: s.$2 }}
        variant="fluid"
        onPress={done}
        title="Done"
      />
    </>
  )
}
