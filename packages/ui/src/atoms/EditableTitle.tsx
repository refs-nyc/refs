import { useState } from 'react'
import { TextInput } from 'react-native'
import { XStack, H2 } from 'tamagui'
import { Pencil } from '@tamagui/lucide-icons'
import { Pressable } from 'react-native'
import { getTokens } from '@tamagui/core'
import { Check } from '@tamagui/lucide-icons'

export const EditableTitle = ({ title }: { title: string }) => {
  const [titleState, setTitleState] = useState(title)
  const [editing, setEditing] = useState(false)

  console.log(titleState)

  const { size, color } = getTokens()

  return (
    <>
      {!editing ? (
        <Pressable onPress={() => setEditing(true)}>
          <XStack gap="$3" jc="center" ai="center">
            <H2 ta="center" col="$color12">
              {titleState}
            </H2>
            <Pencil size="$1" color="$muted"></Pencil>
          </XStack>
        </Pressable>
      ) : (
        <Pressable onPress={() => setEditing(false)}>
          <XStack gap="$3" jc="center" ai="center">
            <TextInput
              style={{
                fontWeight: 'bold',
                fontSize: size.$2.val,
              }}
              autoFocus={true}
              value={titleState}
              placeholder="Edit"
              onChangeText={setTitleState}
            ></TextInput>
            <Check />
          </XStack>
        </Pressable>
      )}
    </>
  )
}
